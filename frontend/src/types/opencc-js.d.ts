declare module 'opencc-js' {
  export interface OpenCC {
    Converter(options: { from: string; to: string }): (text: string) => string;
  }

  const OpenCC: OpenCC;
  export = OpenCC;
}