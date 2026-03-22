import { Node, mergeAttributes } from "@tiptap/core";

const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { 
        default: null,
        parseHTML: element => element.getAttribute('src'),
      },
      width: { default: "100%" },
      height: { default: "450" },
      frameborder: { default: "0" },
      allowfullscreen: { default: "true" },
      sandbox: { default: "allow-forms allow-scripts allow-popups allow-same-origin allow-presentation" },
      allow: { default: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" }
    };
  },

  parseHTML() {
    return [{ tag: "iframe" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div", 
      { class: "iframe-wrapper shadow-mc-block" },
      ["iframe", mergeAttributes({ loading: "lazy", style: "border:0; border-radius: 4px;" }, HTMLAttributes)]
    ];
  },
});

export default Iframe;