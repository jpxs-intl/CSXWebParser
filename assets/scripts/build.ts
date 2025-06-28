import { fileListManager } from "..";
import { AnyFile } from "./fileList";

type WriteFile = AnyFile & {
  extension: "sbl" | "sbb" | "png";
};

export default function BuildCSX() {
  // help from noche and checkraisefold with this

  /*
        4 bytes - Magic, value 0xC5F17E01
        4 bytes - Offset from beginning of file where lookup table starts
        4 bytes - Amount of 0x40 byte segments in lookup table/assets stored by CSX file
        
        Rest of file until offset - Data.
        Rest of file at/after offset - 0x40 byte segments for lookup table

        Lookup table segments:
        each starting with 0x02005A58 magic (02 can be 01 or 04 instead, file type?)
        4 bytes - Offset from start of file where file data begins. Textures specifically are prepended with a custom header for materials.
        4 bytes - File size. This ends at the actual last byte from the file if you offset from the start of the file header.
        52 bytes - File name. This is padded with 0x00 bytes at the end.
      */

  let fileStorage: WriteFile[] = fileListManager.files.filter((file) => {
    return file.extension === "sbl" || file.extension === "sbb" || file.extension === "png";
  }) as WriteFile[];

  const storageOrder = {
    sbb: 1,
    sbl: 2,
    png: 3
  }
  fileStorage.sort((a, b) => {
    if (storageOrder[a.extension] > storageOrder[b.extension])
      return 1;
    if (storageOrder[a.extension] < storageOrder[b.extension])
      return -1;
    return 0;
  })

  const fileMagics = {
    sbb: 0x02005a58,
    sbl: 0x01005a58,
    png: 0x04005a58,
  };

  const tableData: {
    fileMagic: number;
    fileOffset: number;
    fileSize: number;
    fileName: string;
  }[] = [];

  let currentOffset = 12;

  // calcuate table data size and offsets
  for (let i = 0; i < fileStorage.length; i++) {
    const file = fileStorage[i];

    const size = file.data.byteLength;

    tableData.push({
      fileMagic: fileMagics[file.extension],
      fileOffset: currentOffset,
      fileSize: size,
      fileName: file.name,
    });

    currentOffset += size
  }

  // calculate file size
  let fileSize = 12 + fileStorage.length * 0x40;
  for (let i = 0; i < fileStorage.length; i++) {
    const file = fileStorage[i];
    fileSize += file.data.byteLength;

    if (file.extension == "png" && file.materialData)
      fileSize += file.materialData.byteLength
  }

  // make a buffer for the file
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // write the header
  const tableOffset = view.byteLength - tableData.length * 0x40;
  view.setUint32(0, 0xc5f17e01, true); // magic
  view.setUint32(4, tableOffset, true); // table offset
  view.setUint32(8, fileStorage.length, true); // table length

  // write the data
  let dataOffset = 12;
  for (let i = 0; i < fileStorage.length; i++) {
    const file = fileStorage[i];
    const fileView = new DataView(file.data);
    const fileLen = fileView.byteLength;

    if (file.extension == "sbb" || file.extension == "sbl") {
      fileView.setUint8(0, 0x01)
    }

    if (file.extension == "png") {
      let materialLen = file.materialData ? file.materialData.byteLength : 0;
      view.setUint32(dataOffset, 0x01, true);

      if (file.materialName) {
        writeString(view, file.materialName, dataOffset + 0x4, 0x40)
      }

      view.setUint32(dataOffset + 0x44, fileLen, true);
      view.setUint32(dataOffset + 0x48, materialLen, true);

      dataOffset += 0x4c;
      write(view, fileView, dataOffset);
      dataOffset += fileLen;

      if (file.materialData) {
        const materialView = new DataView(file.materialData);

        write(view, materialView, dataOffset + fileLen);
        dataOffset += materialView.byteLength;
      }
    } else {
      write(view, fileView, dataOffset);
      dataOffset += fileLen;
    }
  }

  // write the table
  for (let i = 0; i < tableData.length; i++) {
    const file = tableData[i];

    view.setUint32(tableOffset + i * 0x40, file.fileMagic);
    view.setUint32(tableOffset + i * 0x40 + 4, file.fileOffset, true);
    view.setUint32(tableOffset + i * 0x40 + 8, file.fileSize, true);
    writeString(view, file.fileName.replace(/\.[^/.]+$/, ""), tableOffset + i * 0x40 + 12, 0x34);
  }

  // download the file
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "build.csx";
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function writeString(dataView: DataView, str: string, offset: number, maxLen?: number) {
  for (let i = 0; i < (maxLen ?? str.length); i++) {
    dataView.setUint8(offset + i, str.charCodeAt(i));
  }
}

function write(dataView: DataView, buffer: ArrayBuffer | DataView, offset: number) {
  const view = buffer instanceof DataView ? buffer : new DataView(buffer);
  for (let i = 0; i < buffer.byteLength; i++) {
    dataView.setUint8(offset + i, view.getUint8(i));
  }
}
