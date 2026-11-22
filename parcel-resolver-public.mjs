import { Resolver } from "@parcel/plugin";
import path from "node:path";

// Zine emits absolute URLs (e.g. /css/style.css) into public/index.html.
// Parcel resolves absolute specifiers from the project root, so map them to
// the generated public/ directory instead, where Zine actually put the files.
export default new Resolver({
  async resolve({ specifier, options }) {
    if (!specifier.startsWith("/") || specifier.startsWith("//")) {
      return null;
    }

    const filePath = path.join(options.projectRoot, "public", specifier);
    let stat;
    try {
      stat = await options.inputFS.stat(filePath);
    } catch {
      return null;
    }
    if (!stat || !stat.isFile()) {
      return null;
    }

    return {
      filePath,
      invalidateOnFileChange: [filePath],
      invalidateOnFileCreate: [{ filePath }],
    };
  },
});
