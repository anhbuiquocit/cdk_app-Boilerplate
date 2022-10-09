module.exports = {
  content: ['../../packages/ui/**/*.{ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        colorTheme: '#47B7AB',
        colorTextGray: '#697B8C',
        bgGray:'#E9EDF3',
        colorBorderGray: '#C1C1C1',
        colorBorderBlue: '#4A90E2',
        colorBackGroundGray: '#F8F8F8',
        colorFileAttrach: '#979797',
        colorTextBase: '#3A9FFF',
        colorBGContract: '#00000026',
        colorPayment: '#d2d2d2',
        colorBGPayment: '#f2f2f2',
        borderGray: '#ccc',
        bgFooter: '#f7fafc',
        themeBlue: '3A9FFF',
        bgInformation: '#FAFAFA',
        bgFooterRegister: '#F6F6F6'
      },
      boxShadow: {
        shadowCard: 'rgba(0, 0, 0, 0.15) -1px 1px 1px 1px',
      },
      fontSize: {
        fs3: "3px",
        fs21: "21px"
      }
    },

  },
  plugins: [],
};