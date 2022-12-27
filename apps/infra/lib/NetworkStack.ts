import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
interface NetworkStackProps extends cdk.StackProps {
  appName: string;
  bastionSshKeyName: string;
}
export class NetworkStack extends cdk.Stack {
  public readonly vpc: cdk.aws_ec2.Vpc;

  public readonly privateSg: cdk.aws_ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { appName, bastionSshKeyName } = props;

    // Create the VPC needed for the Aurora Serverless DB cluster
    const { vpc, privateSg } = this.CreateVpcAndSecurityGroup({
      appName,
    });
    this.CreateBastionEc2({ vpc, privateSg, appName, bastionSshKeyName });
    this.vpc = vpc;
    this.privateSg = privateSg;
  }

  private CreateVpcAndSecurityGroup({ appName }: { appName: string }): {
    vpc: cdk.aws_ec2.Vpc;
    privateSg: cdk.aws_ec2.SecurityGroup;
  } {
    // 👇 this elastic IPs are for created manually. to keep it consistent
    // const allocationIds: string[] = [
    //   'eipalloc-032ab13c75c276d0c',
    //   'eipalloc-0b068e6d4d1bfc363',
    // ];
    const vpc = new cdk.aws_ec2.Vpc(this, `${appName}-CdkVPC`, {
      // cidr: '100.0.0.0/16',
      // natGateways: 2,

      // natGatewayProvider: cdk.aws_ec2.NatProvider.gateway({
      //   eipAllocationIds: allocationIds,
      // }),
      natGatewayProvider: cdk.aws_ec2.NatProvider.instance({
        instanceType: new cdk.aws_ec2.InstanceType("t2.micro"),
      }),
      maxAzs: 2,
      // enableDnsHostnames: true,
      // enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 22,
          name: "public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 22,
          name: "private1",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 22,
          name: "private2",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // const igw = new cdk.aws_ec2.CfnInternetGateway(
    //   this,
    //   `${appName}-InternetGateway`,
    // );
    // // eslint-disable-next-line no-new
    // new cdk.aws_ec2.CfnVPCGatewayAttachment(
    //   this,
    //   `${appName}-VpcGatewayAttachment`,
    //   {
    //     vpcId: vpc.vpcId,
    //     internetGatewayId: igw.ref,
    //   },
    // );

    vpc.publicSubnets.forEach((subnet) => {
      // Find the NAT Gateway in the subnet construct children
      // const natGateway = subnet.node.children.find(
      //   (child) => child.node.id === 'NATGateway',
      // ) as cdk.aws_ec2.CfnNatGateway;
      // Delete the default EIP created by CDK
      subnet.node.tryRemoveChild("EIP");
      // Override the allocationId on the NATGateway
      // natGateway.allocationId = allocationIds[index];
    });

    // Create the required security group
    const privateSg = new cdk.aws_ec2.SecurityGroup(
      this,
      `${appName}-private-sg-1`,
      {
        vpc,
        securityGroupName: "private-sg-1",
      }
    );
    privateSg.addIngressRule(
      privateSg,
      cdk.aws_ec2.Port.allTraffic(),
      "allow internal SG access"
    );
    return { vpc, privateSg };
  }

  private CreateBastionEc2({
    appName,
    vpc,
    privateSg,
    bastionSshKeyName,
  }: {
    vpc: cdk.aws_ec2.Vpc;
    privateSg: cdk.aws_ec2.SecurityGroup;
    appName: string;
    bastionSshKeyName: string;
  }): void {
    // Fetch the latest Ubuntu AMI
    const ami = new cdk.aws_ec2.LookupMachineImage({
      name: "ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*",
      filters: { "virtualization-type": ["hvm"] },
      // Canonical AWS Account ID
      owners: ["099720109477"],
    });

    // EC2 instance and public Security Group
    const publicSg = new cdk.aws_ec2.SecurityGroup(
      this,
      `${appName}-public-sg-1`,
      {
        vpc,
        securityGroupName: "public-sg-1",
      }
    );
    publicSg.addIngressRule(
      cdk.aws_ec2.Peer.anyIpv4(),
      cdk.aws_ec2.Port.tcp(22),
      "allow SSH access"
    );

    privateSg.addIngressRule(
      publicSg,
      cdk.aws_ec2.Port.tcp(5432),
      "allow Aurora Serverless Postgres access"
    );

    // eslint-disable-next-line no-new
    new cdk.aws_ec2.Instance(this, "jump-box", {
      vpc,
      securityGroup: publicSg,
      vpcSubnets: { subnetType: cdk.aws_ec2.SubnetType.PUBLIC },
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T2,
        cdk.aws_ec2.InstanceSize.MICRO
      ),
      machineImage: cdk.aws_ec2.MachineImage.genericLinux({
        [this.region]: ami.getImage(this).imageId,
      }),
      keyName: bastionSshKeyName, // this.node.tryGetContext('keyName'),
    });
  }
}
