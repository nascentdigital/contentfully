// expected raw rich text field
export interface RichTextRaw {
  data: {
      target: {
          sys: {
              id: string,
              type: string,
              linkType: string
          }
      }
  },
  nodeType: string,
  content?: Array<RichTextRaw>
};

// transformed richtext
export interface RichText extends RichTextRaw {
  data: any,
  content?: Array<RichText>
};