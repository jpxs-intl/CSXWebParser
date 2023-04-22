export interface File {
  name: string;
  extension: "sbl" | "sbb" | "png" | "csx";
  size: number;
  reflectiveness?: number;
  data: ArrayBuffer;
}

export default class FileListManager {
  public files: File[] = [];
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

  public add(file: File) {
    this.files.push(file);
  }

  public remove(file: File) {
    this.files.splice(this.files.indexOf(file), 1);
  }

  public clear() {
    this.files = [];
  }

  public updateFileList() {
    this.fileListElement.innerHTML = "";

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
        fileElement.classList.add("file");
        fileElement.innerHTML = `
                <div class="file-left">
                    <div class="file-name">${file.name}</div>
                </div>
                <div class="file-right">
                    <div class="file-size">${FileListManager.formatFileSize(file.size)}</div>
                    ${file.extension == "png" ? `<div class="file-reflectiveness">${file.reflectiveness}</div>` : ""}
                    <div class="file-extension">${
                      FileListManager.fileTypes[file.extension as "csx" | "sbl" | "sbb" | "png"]
                    }</div>
                    <button class="button remove" id="remove-${index}">Remove</button>
                    <button class="button download" id="download-${index}">Download</button>
                </div>
            `;

        fileElement.querySelector(`#remove-${index}`)?.addEventListener("click", () => {
          this.remove(file);
          this.updateFileList();
        });

        fileElement.querySelector(`#download-${index}`)?.addEventListener("click", () => {
          const blob = new Blob([file.data], { type: "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          a.remove();
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
