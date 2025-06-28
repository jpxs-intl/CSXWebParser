export default function openFileInputDialog(extension?: string, multiple?: boolean): Promise<FileList | null> {
  const fileInputElement = document.createElement("input");
  fileInputElement.type = "file";
  fileInputElement.accept = extension || ".csx,.sbl,.sbb,.png";
  fileInputElement.multiple = multiple ?? true;

  return new Promise((resolve) => {
    fileInputElement.onchange = () => {
      resolve(fileInputElement.files);
    };
    fileInputElement.click();
  });
}
