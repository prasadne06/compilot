// mammoth ships a prebuilt browser bundle without type declarations
declare module 'mammoth/mammoth.browser.js' {
  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: unknown[] }>
  }
  export default mammoth
}
