import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from '@google/generative-ai/server';

import { summaryPrompt } from "./prompt.js";

// import { evaluasi, evaluasiFile } from "./prompt.js";

const geminiAPI = 'AIzaSyDZ4Yrp8i4j2FmUPIGvVpxNlbvUa4QIJ-k';
const genAI = new GoogleGenerativeAI(geminiAPI);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const fileManager = new GoogleAIFileManager(geminiAPI);

export async function getAllGeminiFiles(){
  const listFiles = await fileManager.listFiles();
  // console.log(listFiles.files);
  return listFiles.files;
};

export async function checkUploadedFiles(files, boolean){
  const listFiles = await getAllGeminiFiles();
  let result = [];
  if(listFiles !== undefined ){
    if(boolean === true){
      console.log('check uploaded files in gemini');
      files.forEach(item => {
        const fileCheck = listFiles.find(file => file.displayName === item.localPath);
        if(fileCheck){
          item.uri = fileCheck.uri;
          item.state = fileCheck.state;
          item.geminiName = fileCheck.name;
          result.push(item);
        };
      });
    } else {
      console.log('check not uploaded files in gemini');
      files.forEach(item => {
        const fileCheck = listFiles.find(file => file.displayName === item.localPath);
        if(!fileCheck){
          result.push(item);
        };
      });
    };
  };
  return result;
};

export async function uploadFileToGemini(pdfPath, mimeType){
  console.log(`upload "${pdfPath}" to Gemini ...`);

  const uploadFile = await fileManager.uploadFile(pdfPath, {
    mimeType: mimeType,
    displayName: pdfPath,
  });

  const file = uploadFile.file;
  // console.log(`'${file.displayName}' as '${file.name}' was uploaded`);

  return file;
};

export async function checkActiveFilesInGemini(files){
  console.log(`check if file is ready to use or not ...`);

  for (const pdf of files.map((file) => file.geminiName)){
    let file = await fileManager.getFile(pdf);
    
    while (file.state === 'PROCESSING'){
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(pdf);
    };

    if (file.state !== 'ACTIVE'){
      throw Error(`${file.localPath} failed to process`);
    };
  };

  console.log('all files ready to process!');
};

export async function processFileInGemini(pdfList){
  const notUploadedFiles = await checkUploadedFiles(pdfList, false);
  // console.log(notUploadedFiles);

  const sources = notUploadedFiles.map(async file => {
    return await uploadFileToGemini(file.localPath, file.mimeType);
  });
  
  const sourcesPromise = await Promise.all(sources);
  // console.log(sourcesPromise);

  const uploadFiles = notUploadedFiles.map(file => {
    sourcesPromise.forEach(source => {
      if(file.localPath === source.displayName){
        file.uri = source.uri;
        file.state = source.state;
        file.geminiName = source.name;
      };
    });
    return file;
  });
  // console.log(uploadFiles);
  
  const uploadedFiles = await checkUploadedFiles(pdfList, true);
  // console.log(uploadedFiles);

  await checkActiveFilesInGemini(uploadedFiles);

  return uploadedFiles;
};

export async function summarizeFile(source){
  // console.log(source);
  const prompt = summaryPrompt();

  let content = [{
    fileData: {
      mimeType: source.mimeType,
      fileUri: source.uri,
    },
  }];
  
  content.push({
    text: prompt,
  });
  // console.log(content);

  const result = await model.generateContent(content);
  // source.summary = result.response.text();
  return result.response.text();
};

export async function deleteAllGeminiFiles(name){
  const listFiles = await fileManager.listFiles();
  // console.log(listFiles.files);

  await fileManager.deleteFile(name);
  // for await (let file of listFiles.files){
  //   await fileManager.deleteFile(file.name);
  // };
};