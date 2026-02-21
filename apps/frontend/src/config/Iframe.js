import { Node, mergeAttributes } from "@tiptap/core";

const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      width: { default: "100%" },
      height: { default: "400" },
      frameborder: { default: "0" },
      allowfullscreen: { default: "true" },
    };
  },

  parseHTML() {
    return [{ tag: "iframe" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(
        {
          loading: "lazy",
          style: "border:0;",
        },
        HTMLAttributes
      ),
    ];
  },
});

export default Iframe;
