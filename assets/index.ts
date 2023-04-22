import BuildCSX from "./scripts/build";
import openFileInputDialog from "./scripts/fileInputDialog";
import FileListManager from "./scripts/fileList";
import ParseCSX from "./scripts/parse";
import zip from "jszip";

const uploadButton = document.getElementById("upload") as HTMLButtonElement;
const downloadAll = document.getElementById("download-all") as HTMLButtonElement;
const downloadCSX = document.getElementById("download-csx") as HTMLButtonElement;

const fileListElement = document.getElementById("list") as HTMLUListElement;

export const fileListManager = new FileListManager(fileListElement);

const sortBySelector = document.getElementById("sort") as HTMLSelectElement;
const sortDirectionSelector = document.getElementById("order") as HTMLSelectElement;

sortBySelector.addEventListener("change", () => {
  fileListManager.sortBy = sortBySelector.value as any;
  fileListManager.updateFileList();
});

sortDirectionSelector.addEventListener("change", () => {
  fileListManager.sortDirection = sortDirectionSelector.value as any;
  fileListManager.updateFileList();
});

uploadButton.addEventListener("click", async () => {
  openFileInputDialog().then((files) => {
    if (!files) return;
    const fileArray = Array.from(files);

    if (fileArray.find((file) => file.name.endsWith(".csx"))) {
      // csx file upload

      const csxFile = fileArray.find((file) => file.name.endsWith(".csx"))!;
      const csxReader = new FileReader();
      csxReader.readAsArrayBuffer(csxFile);
      csxReader.onload = () => {
        const csx = csxReader.result as ArrayBuffer;
        const csxFiles = ParseCSX(csx);
      };
    } else {
      // sbl/sbb/png file upload

      console.log(fileArray);

      fileArray.forEach((file) => {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = () => {
          const fileBuffer = fileReader.result as ArrayBuffer;
          fileListManager.add({
            name: file.name,
            size: file.size,
            extension: file.name.split(".").pop() as any,
            data: fileBuffer,
          });

          fileListManager.updateFileList();
        };
      });
    }
  });
});

downloadAll.addEventListener("click", () => {
  const zipfile = new zip();

  zipfile.folder("texture");
  zipfile.folder("block");
  zipfile.folder("building");

  fileListManager.files.forEach((file) => {
    const blob = new Blob([file.data], { type: "application/octet-stream" });

    switch (file.extension) {
      case "png":
        zipfile.file(`texture/${file.name}.png`, blob);
        break;
      case "sbl":
        zipfile.file(`block/${file.name}.sbl`, blob);
        break;
      case "sbb":
        zipfile.file(`building/${file.name}.sbb`, blob);
        break;
    }
  });

  zipfile.generateAsync({ type: "blob" }).then((content) => {
    const downloadElement = document.createElement("a");
    downloadElement.href = URL.createObjectURL(content);
    downloadElement.download = "csx.zip";
    downloadElement.click();

    URL.revokeObjectURL(downloadElement.href);
    downloadElement.remove();
  });
});

downloadCSX.addEventListener("click", () => {
  BuildCSX();
});
