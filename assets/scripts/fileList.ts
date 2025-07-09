import openFileInputDialog from "./fileInputDialog";

interface FileData {
  name: string;
  size: number;
  data: ArrayBuffer;
}

export type Texture = {
  extension: "png";
  textureSize: number;
  materialSize: number;

  materialName?: string;
  materialData?: ArrayBuffer;
} & FileData;

export type File = {
  extension: "sbl" | "sbb" | "csx";
} & FileData;

export type AnyFile = Texture | File;

export default class FileListManager {
  public files: AnyFile[] = [];
  public fileListElement: HTMLUListElement;

  public static fileTypes = {
    csx: "File Bundle",
    sbl: "Block File",
    sbb: "Building File",
    png: "Texture File",
  } as const;

  public sortBy: "name" | "size" | "extension" = "name";
  public sortDirection: "asc" | "desc" = "asc";

  constructor(fileListElement: HTMLUListElement) {
    this.fileListElement = fileListElement;
  }

  public add(file: AnyFile) {
    this.files.push(file);
  }

  public remove(file: AnyFile) {
    this.files.splice(this.files.indexOf(file), 1);
  }

  public clear() {
    this.files = [];
  }

  public static downloadFile(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  public updateFileList() {
    this.fileListElement.innerHTML = "";

    const headerElement = document.createElement("tr");
    headerElement.innerHTML = `
      <th>Name</th>
      <th>Size</th>
      <th>Material</th>
      <th>Extension</th>
    `;
    this.fileListElement.appendChild(headerElement);

    this.files
      //   .sort((a, b) => {
      //     if (this.sortBy == "name") {
      //       if (this.sortDirection == "asc") {
      //         return a.name.localeCompare(b.name);
      //       } else {
      //         return b.name.localeCompare(a.name);
      //       }
      //     } else if (this.sortBy == "size") {
      //       if (this.sortDirection == "asc") {
      //         return a.size - b.size;
      //       } else {
      //         return b.size - a.size;
      //       }
      //     } else if (this.sortBy == "extension") {
      //       if (this.sortDirection == "asc") {
      //         return a.extension.localeCompare(b.extension);
      //       } else {
      //         return b.extension.localeCompare(a.extension);
      //       }
      //     }

      //     return 0;
      //   })
      .forEach((file, index) => {
        const fileElement = document.createElement("tr");
        fileElement.innerHTML = `
                <td>${file.name}</td>
                <td>${FileListManager.formatFileSize(file.size)}</td>
                <td>${
                  file.extension == "png" ? `${file.materialName ?? ""}` : ""
                }</td>
                <td>${
                  FileListManager.fileTypes[
                    file.extension as "csx" | "sbl" | "sbb" | "png"
                  ]
                }
                <span class="file-actions">
                  <button class="button file-action-button remove" id="remove-${index}" title="Remove"><i class="fa fa-times"></i></button>
                  <button class="button file-action-button download" id="download-${index}" title="Download"><i class="fa fa-download"></i></button>
                  
                  ${
                    file.extension == "png"
                      ? `<button class="button file-action-button set-mat" id="set-mat-${index}" title="Set Material"><i class="fa fa-wrench"></i></button>`
                      : ""
                  }
                  ${
                    file.extension == "png" && file.materialData
                      ? `<button class="button file-action-button download-mat" id="download-mat-${index}" title="Download Material"><i class="fa fa-download"></i></button>`
                      : ""
                  }
                  ${
                    file.extension == "png" && file.materialData
                      ? `<button class="button file-action-button remove-mat" id="remove-mat-${index}" title="Remove Material"><i class="fa fa-times"></i></button>`
                      : ""
                  }
                </span>
                </td>
            `;

        fileElement
          .querySelector(`#remove-${index}`)
          ?.addEventListener("click", () => {
            this.remove(file);
            this.updateFileList();
          });

        fileElement
          .querySelector(`#set-mat-${index}`)
          ?.addEventListener("click", () => {
            if (file.extension != "png") return;

            openFileInputDialog(".png", false).then(async (files) => {
              if (!files) return;

              let [diskFile] = files;
              const fileReader = new FileReader();
              fileReader.readAsArrayBuffer(diskFile);
              fileReader.onload = () => {
                const fileBuffer = fileReader.result as ArrayBuffer;
                const nameBuff = diskFile.name.split(".");
                const extension = nameBuff.pop();

                if (extension != "png") {
                  return;
                }

                file.materialName = nameBuff.join();
                file.materialData = fileBuffer;
                this.updateFileList();
              };
            });
          });

        fileElement
          .querySelector(`#download-${index}`)
          ?.addEventListener("click", () => {
            const blob = new Blob([file.data], {
              type: "application/octet-stream",
            });
            FileListManager.downloadFile(
              file.name + "." + file.extension,
              blob
            );
          });

        fileElement
          .querySelector(`#download-mat-${index}`)
          ?.addEventListener("click", () => {
            if (file.extension != "png" || !file.materialData) return;

            const blob = new Blob([file.materialData], {
              type: "application/octet-stream",
            });
            const name = file.materialName ?? file.name;
            FileListManager.downloadFile(name + ".png", blob);
          });

        fileElement
          .querySelector(`#remove-mat-${index}`)
          ?.addEventListener("click", () => {
            if (file.extension != "png" || !file.materialData) return;

            file.materialName = undefined;
            file.materialData = undefined;
            file.materialSize = 0;
            this.updateFileList();
          });

        this.fileListElement.appendChild(fileElement);
      });
  }

  public static formatFileSize(bytes: number) {
    const sizes = ["bytes", "KiB", "MiB", "GiB", "TiB"];
    if (bytes == 0) return "0 bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}
