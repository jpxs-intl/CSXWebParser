import { fileListManager } from "..";
import { File } from "./fileList";

type WriteFile = File & {
  extension: "sbl" | "sbb" | "png";
};

export default function BuildCSX() {
  // help from noche and checkraisefold with this

  /*
        4 bytes - Magic, value 0x017EF1C5
        4 bytes - Offset from beginning of file where lookup table starts
        4 bytes - Amount of 0x40 byte segments in lookup table/assets stored by CSX file
        
        Rest of file until offset - Data.
        Rest of file at/after offset - 0x40 byte segments for lookup table

        Lookup table segments:
        each starting with 0x02005A58 magic (02 can be 01 or 04 instead, file type?)
        4 bytes - Offset from start of file where beginning of 0x4C file header starts. This file header seems to be mostly useless information?
        4 bytes - File size. This ends at the actual last byte from the file if you offset from the start of the file header.
        52 bytes - File name. This is padded with 0x00 bytes at the end.
      */

  let fileStorage: WriteFile[] = fileListManager.files.filter((file) => {
    return file.extension === "sbl" || file.extension === "sbb" || file.extension === "png";
  }) as WriteFile[];

  const fileMagics = {
    sbb: 0x02005a58,
    sbl: 0x01005a58,
    png: 0x04005a58,
  };

  const offsets = {
    sbl: 0x0,
    sbb: 0x0,
    png: 0x4c,
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

    const size = file.extension == "png" ? file.data.byteLength : file.data.byteLength + 43;

    tableData.push({
      fileMagic: fileMagics[file.extension],
      fileOffset: currentOffset,
      fileSize: size,
      fileName: file.name,
    });

    currentOffset += size + offsets[file.extension]
  }

  // calculate file size
  let fileSize = 12 + fileStorage.length * 0x40;
  for (let i = 0; i < fileStorage.length; i++) {
    const file = fileStorage[i];
    fileSize += file.data.byteLength + offsets[file.extension];
  }

  // make a buffer for the file
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // write the header
  view.setUint32(0, 0x017ef1c5); // magic
  view.setUint32(4, view.byteLength - tableData.length * 0x40, true); // table offset
  view.setUint32(8, fileStorage.length, true); // table length

  // write the data
  let dataOffset = 12;
  for (let i = 0; i < fileStorage.length; i++) {
    const file = fileStorage[i];

    if (file.extension == "png") {
      view.setInt8(dataOffset, 0x01);
      view.setInt32(dataOffset + 43, file.data.byteLength, true);
    }

    const fileOffset = dataOffset + offsets[file.extension];
    write(view, file.data, fileOffset);
    dataOffset += file.data.byteLength + offsets[file.extension];
  }

  // write the table
  const tableOffset = view.byteLength - tableData.length * 0x40;
  for (let i = 0; i < tableData.length; i++) {
    const file = tableData[i];

    view.setUint32(tableOffset + i * 0x40, file.fileMagic);
    view.setUint32(tableOffset + i * 0x40 + 4, file.fileOffset, true);
    view.setUint32(tableOffset + i * 0x40 + 8, file.fileSize, true);
    writeString(view, file.fileName, tableOffset + i * 0x40 + 12);
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

function writeString(dataView: DataView, str: string, offset: number) {
  for (let i = 0; i < str.length; i++) {
    dataView.setUint8(offset + i, str.charCodeAt(i));
  }
}

function write(dataView: DataView, buffer: ArrayBuffer | DataView, offset: number) {
  const view = buffer instanceof DataView ? buffer : new DataView(buffer);
  for (let i = 0; i < buffer.byteLength; i++) {
    dataView.setUint8(offset + i, view.getUint8(i));
  }
}
