import { fileListManager } from "..";

export default function ParseCSX(buffer: ArrayBuffer) {
  function getString(dataView: DataView, offset: number, length: number) {
    let str = "";
    for (let i = 0; i < length; i++) {
      const char = dataView.getUint8(offset + i);
      if (char === 0) {
        break;
      }
      str += String.fromCharCode(char);
    }
    return str;
  }

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

  const dataView = new DataView(buffer);

  const magic = dataView.getUint32(0, true);
  const tableOffset = dataView.getUint32(4, true);
  const tableSize = dataView.getUint32(8, true);

  let offset = tableOffset;

  let fileTable: {
    name: string;
    offset: number;
    size: number;
    magic: number;
  }[] = [];

  for (let i = 0; i < tableSize; i++) {
    const magic = dataView.getUint8(offset);
    const fileOffset = dataView.getUint32(offset + 4, true);
    const fileSize = dataView.getUint32(offset + 8, true);
    const fileName = getString(dataView, offset + 12, 52);

    fileTable.push({
      name: fileName,
      offset: fileOffset,
      size: fileSize,
      magic: magic,
    });

    console.log(`${i}/${tableSize}`, fileName, magic.toString(16));
    offset += 0x40;
  }

  // save files

  console.log(fileTable.length);

  for (let i = 0; i < fileTable.length; i++) {
    const file = fileTable[i];

    switch (file.magic) {
      case 0x01: {
        const fileData = buffer.slice(file.offset, file.offset + file.size);
        fileListManager.add({
          name: file.name,
          extension: "sbl",
          size: file.size,
          data: fileData,
        });
        break;
      }
      case 0x02: {
        const fileData = buffer.slice(file.offset, file.offset + file.size);
        fileListManager.add({
          name: file.name,
          extension: "sbb",
          size: file.size,
          data: fileData,
        });

        break;
      }
      case 0x04: {
        const fileData = buffer.slice(file.offset + 0x4c, file.offset + file.size);
        fileListManager.add({
          name: file.name,
          extension: "png",
          size: file.size,
          data: fileData,
        });
        break;
      }
      default: {
        console.log("unknown file type", file.magic.toString(16));
      }
    }
  }

  fileListManager.updateFileList();
}
