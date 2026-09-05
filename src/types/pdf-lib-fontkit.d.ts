// @pdf-lib/fontkit nemá vlastní .d.ts. pdf-lib registerFontkit() bere Fontkit;
// stačí nám default export jako any.
declare module '@pdf-lib/fontkit' {
  const fontkit: any
  export default fontkit
}
