import fs from 'fs';
import https from 'https';

export async function downloadFile(url, fileName){
  console.log(`downloading ${fileName}`);

  const downloadPath = `./public/tmp/${fileName}`;

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(downloadPath);
    https.get(url, (response) => {
      if(response.statusCode !== 200){
        reject(new Error(`failed to download file: ${response.statusCode}`));
      };

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`${fileName} downloaded successfully`);
        resolve();
      });

      file.on('error', (error) => {
        console.error(`Error writing file: ${error}`);
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

export function getLocalFilePath(){
  const dirPath = './public/tmp';

  if(!fs.existsSync(dirPath)){
    console.log(`create '${dirPath}' directory...`);
    fs.mkdirSync(dirPath);
  };
  
  const pdfList = fs.readdirSync(dirPath);
  // console.log(pdfList);

  const pdfPath = pdfList.map(item => {
    return {
      path: dirPath + '/',
      name: item,
    };
  });

  return pdfPath;
};
