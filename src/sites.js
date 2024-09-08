import fs from 'fs';

import { downloadFile } from "./fileHandler.js";
import { graphEndPoint, siteId, driveId, listId } from "./auth/config.js";
import { graphQueryGet, graphQueryPatch } from "./graph.js";
import { deltaCollection } from './mongodb.js';

async function getUnsummarizedFiles(accessToken){
  let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/drive/root/children`;
  graphUrl += `?expand=listItem`;
  graphUrl += `&select=id,name,@microsoft.graph.downloadUrl,file`;

  const filesList = await graphQueryGet(graphUrl, accessToken);

  const unsummarizedFiles = filesList.value.filter(item => {
    return item.listItem.fields.Summary === undefined ||
      item.listItem.fields.Summary === '';
  });

  const list = unsummarizedFiles.map(item => {
    return {
      driveId: item.id,
      listId: item.listItem.id,
      name: item.name,
      summary: item.listItem.summary,
      mimeType: item.file.mimeType,
      downloadUrl: item['@microsoft.graph.downloadUrl'],
      localPath: `./public/tmp/${item.name}`,
    };
  });

  return list;
};

export async function getFilesSites(accessToken){
  const unsummarizedFiles = await getUnsummarizedFiles(accessToken);
  // console.log(unsummarizedFiles);

  if(unsummarizedFiles.length === 0){
    console.log('all files already summarized');
    return [];
  } else {
    for await (let file of unsummarizedFiles){
      await downloadFile(file.downloadUrl, file.name);
    };
    return unsummarizedFiles;
  };
};

export async function updateFileSummary(accessToken, fileList){
  let graphUrl = `/sites/${siteId}/lists/${listId}`;
  console.log(fileList);

  fileList.forEach(async item => {
    const endpoint = graphEndPoint + graphUrl + `/items/${item.listId}/fields`;
    const update = {
      'Summary': item.summary,
    };

    await graphQueryPatch(endpoint, update, accessToken);
  });
};

export async function getFilesSitesDelta(accessToken){

  // let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/drive/root/children/delta`; // 400
  
  // let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/drive/delta`; // 400

  let graphUrl = `${graphEndPoint}/sites/delta`; // 403
  // graphUrl = `?token=latest`; // 403 ngambil perubahan terakhir
  

  // let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/items/delta`; // 200 deltaLink
  // graphUrl = `?token=latest`; // invalid
  // graphUrl += `?expand=listItem`; // 400

  // let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/drive/root/delta`; // 200 deltaLink
  // graphUrl += `?expand=listItem`; // 200 deltaLink navigationLink
  // graphUrl += `&select=id,name,@microsoft.graph.downloadUrl,file`; // 200 deltaLink navigationLink

  // deltaLink
  // let graphUrl = 'https://graph.microsoft.com/v1.0/sites/bb9ab879-7386-4beb-a1c7-e09cfd76ad2e/lists/fd08a2a3-2c69-4b29-90cf-d180eccdf237/drive/root/delta?expand=listItem&select=id,name,@microsoft.graph.downloadUrl,file&token=NDslMjM0OyUyMzE7MztmZDA4YTJhMy0yYzY5LTRiMjktOTBjZi1kMTgwZWNjZGYyMzc7NjM4NjExMjQyNTIzOTAwMDAwOzE2Nzg5MzExOyUyMzslMjM7JTIzMDslMjM'

  const filesList = await graphQueryGet(graphUrl, accessToken);
  console.log(filesList.value);
  // console.log(filesList['@odata.deltaLink']);
  // let graphDelta = filesList['@odata.deltaLink'];
  // const filesListDelta = await graphQueryGet(graphDelta, accessToken);
  // console.log(filesListDelta.value);
};

export async function getDrivesInfo(accessToken){
  // let graphUrl = `${graphEndPoint}/sites/${siteId}/drives`;
  let graphUrl = `${graphEndPoint}/sites`;
  const graphResponse = await graphQueryGet(graphUrl, accessToken);
  console.log(graphResponse);
  return graphResponse;
};

export async function getDeltaLink(accessToken){
  let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/items/delta?token=latest`;
  // let graphUrl = `${graphEndPoint}/sites`;
  const graphResponse = await graphQueryGet(graphUrl, accessToken);
  // console.log(graphResponse);
  const mongoDelta = {
    deltaLink: graphResponse['@odata.deltaLink'],
  };
  // await deltaCollection.insertOne(mongoDelta);
  return graphResponse['@odata.deltaLink'];
};

export async function getSitesChanges(deltaLink, accessToken){
  // console.log(deltaLink);
  // deltaLink += `?expand=listItem`;
  const graphResponse = await graphQueryGet(deltaLink, accessToken);
  // console.log(graphResponse);
  const dataChanges = graphResponse.value.filter(item => item.name !== 'root');
  console.log(dataChanges);
  return dataChanges;
};

export async function belajarSites(accessToken){
  // let graphUrl = `${graphEndPoint}/sites/${siteId}/drives/${driveId}/root/delta`;
  // let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/drive/root/delta`;
  let graphUrl = `${graphEndPoint}/sites/${siteId}/lists/${listId}/items/delta`;
  // graphUrl += `?token=latest`;
  // graphUrl += `?expand=listItem`
  // graphUrl += `?changeType=updated`;

  // const graphResponse = await graphQueryGet(graphUrl, accessToken);
  // console.log(graphResponse);

  let deltaLink = `https://graph.microsoft.com/v1.0/sites/bb9ab879-7386-4beb-a1c7-e09cfd76ad2e/lists/fd08a2a3-2c69-4b29-90cf-d180eccdf237/items/delta?token=NDslMjM0OyUyMzE7MztmZDA4YTJhMy0yYzY5LTRiMjktOTBjZi1kMTgwZWNjZGYyMzc7NjM4NjEyMjk2ODI4MzAwMDAwOzE3MzE2NTMxOyUyMzslMjM7JTIzMDslMjM`;
  // let deltaLink = graphResponse['@odata.deltaLink'];
  const graphDelta = await graphQueryGet(deltaLink, accessToken);
  console.log(graphDelta);

  // const docLibs = graphResponse.value.filter(list => list.list.template === 'documentLibrary');
  // console.log(docLibs);
  // try {
  //   for (const list of docLibs){
  //     console.log(`checking columns in ${list.name}`);
  //     const columns = await graphQueryGet(`${graphUrl}/${list.id}/columns`, accessToken);
  //     console.log(columns);
  //   };
  // } catch (error) {
  //   console.log(error);
  //   throw error;
  // };
};