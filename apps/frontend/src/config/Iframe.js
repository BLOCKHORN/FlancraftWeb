import { Node, mergeAttributes } from '@tiptap/core';

const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: '100%' },
      height: { default: '400' },
      frameborder: { default: '0' },
      allowfullscreen: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const iframe = document.createElement('iframe');
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        iframe.setAttribute(key, value);
      });
      iframe.style.border = 'none';
      return { dom: iframe };
    };
  },
});

export default Iframe;
