import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localForage from "localforage";

/* **
 localforage: https://localforage.github.io/localForage/
 We want to avoid storing too much information inside local storage. IndexedDB works in a similar way and 
 can store a lot more information inside.
 localforage is a helper library that use an asynchronous data store with a simple, localStorage-like API:
 * setItem: Saves data to an offline store.
 * getItem: Gets an item from the storage library and supplies the result to a callback.
*/

const fileCache = localForage.createInstance({
  name: "filecahe",
});

/* **
 esbuild wasm: https://esbuild.github.io/
 We need to overwrite esbuild natural behavior in order to run or create a bundle inside the 
 browser (cannot load up files from file system).
 The build argument inside the setup function represent the bundling process:
 * onResolve: figure out where the file is stored
 * onLoad: attempt to load the file up
*/

export const fetchPlugin = (inputCode: string) => {
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      //  *** handle 'index.js' to not load up contents from the file system
      build.onLoad({ filter: /(^index\.js$)/ }, () => {
        return {
          loader: "jsx",
          contents: inputCode,
        };
      });

      //  *** handle files already fetched and in cache
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        const cacheResult = await fileCache.getItem<esbuild.OnLoadResult>(
          args.path
        );
        if (cacheResult) {
          return cacheResult;
        }
      });

      //  *** handle css files
      build.onLoad({ filter: /.css$/ }, async (args: any) => {
        const { data, request } = await axios.get(args.path);

        // esbuild cannot create css files in the browser => inject it as string in head of the document
        const escaped = data
          .replace(/\n/g, "") // collapse all the css in a single line
          .replace(/"/g, '\\"') // escape double quotes
          .replace(/'/g, "\\'"); // escape single quotes
        const contents = `
          const style = document.createElement("style");
          style.innerText = '${escaped}';
          document.head.appendChild(style);
        `;

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        await fileCache.setItem(args.path, result);

        return result;
      });

      //  *** handle javascript files
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        const { data, request } = await axios.get(args.path);

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents: data,
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        await fileCache.setItem(args.path, result);

        return result;
      });
    },
  };
};
