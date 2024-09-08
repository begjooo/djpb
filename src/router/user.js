import express from 'express';
import fs from 'fs';

import { graphQueryGet } from '../graph.js';
import { graphEndPoint } from '../auth/config.js';
import { getAllGeminiFiles, deleteAllGeminiFiles, processFileInGemini, summarizeFile } from '../ai/gemini.js';
import { belajarSites, getDeltaLink, getSitesChanges, getDrivesInfo, getFilesSites, getFilesSitesDelta, updateFileSummary } from '../sites.js';
import { deltaCollection } from '../mongodb.js';

export const router = express.Router();

// cek auth state
function isAuthenticated(req, res, next){
  if(!req.session.isAuthenticated){
    return res.redirect('/auth/signin');
  };

  next();
};

router.get('/id', isAuthenticated, async (req, res, next) => {
  res.render('id', {
    idTokenClaims: req.session.account.idTokenClaims,
  });
});

router.get('/profile', isAuthenticated, async (req, res, next) => {
  const graphApp = '/me';
  const graphQueryUrl = graphEndPoint + graphApp;

  try {
    const graphResponse = await graphQueryGet(graphQueryUrl, req.session.accessToken);
    console.log('\ngraph response:');
    console.log(graphResponse, '\n');

    res.render('profile', {
      profile: graphResponse,
    });
  } catch (error){
    next(error);
  };
});

router.get('/summary-sites', isAuthenticated, async (req, res, next) => {
  try {
    if(!fs.existsSync('./public')){
      console.log(`create './public' directory...`);
      fs.mkdirSync('./public');
    };

    if(!fs.existsSync('./public/tmp')){
      console.log(`create './public/tmp' directory...`);
      fs.mkdirSync('./public/tmp');
    };

    // download file dari sharepoint
    const filesList = await getFilesSites(req.session.accessToken);
    // console.log(filesList);
    
    if(filesList.length !== 0){
      const fileToProcess = await processFileInGemini(filesList);
      // console.log(fileToProcess);

      for await (let file of fileToProcess){
        try {
          console.log(`summarize '${file.name}'`);
          const genAiResponse = await summarizeFile(file);
          // console.log(genAiResponse);
          file.summary = genAiResponse;
        } catch (error) {
          console.log(error);
          throw error;
        };
      };
      // console.log(fileToProcess);

      // update sharepoint
      await updateFileSummary(req.session.accessToken, fileToProcess);
      console.log('update sharepoint sites done');

      fileToProcess.forEach(file => {
        fs.unlinkSync(file.localPath);
      });
    };
    
    res.render('sitesFiles', {
      data: {'[system]': 'all files already summarized'},
    });

  } catch (error) {
    console.log(error);
    res.render('sitesFiles', {
      data: {'[system]': error},
    });
  };
});

router.get('/delta', isAuthenticated, async (req, res, next) => {
  try {
    if(!fs.existsSync('./public')){
      console.log(`create './public' directory...`);
      fs.mkdirSync('./public');
    };

    if(!fs.existsSync('./public/tmp')){
      console.log(`create './public/tmp' directory...`);
      fs.mkdirSync('./public/tmp');
    };

    // download file dari sharepoint
    const filesList = await getFilesSitesDelta(req.session.accessToken);
    // console.log(filesList);

    res.render('sitesFiles', {
      data: {'[system]': 'all files already summarized'},
    });

  } catch (error) {
    console.log(error);
    res.render('sitesFiles', {
      data: {'[system]': error},
    });
  };
})

router.get('/get-all-gemini-files', async (req, res) => {
  const filesList = await getAllGeminiFiles();
  res.send(filesList);
});

router.get('/delete-all-gemini-files', async (req, res) => {
  await deleteAllGeminiFiles('files/bphatfi92ngx');
  res.send('done');
});

let deltaLink = '';

router.get('/get-delta', isAuthenticated, async (req, res, next) => {
  try {
    if(!fs.existsSync('./public')){
      console.log(`create './public' directory...`);
      fs.mkdirSync('./public');
    };

    if(!fs.existsSync('./public/tmp')){
      console.log(`create './public/tmp' directory...`);
      fs.mkdirSync('./public/tmp');
    };

    // const filesList = await getDrivesInfo(req.session.accessToken);
    const deltaLinkResponse = await getDeltaLink(req.session.accessToken);
    deltaLink = deltaLinkResponse;

    res.render('sitesFiles', {
      data: { 'delta link': deltaLinkResponse },
    });

  } catch (error) {
    console.log(error);
    res.render('sitesFiles', {
      data: {'[system]': error},
    });
  };
});

router.get('/get-changes', isAuthenticated, async (req, res, next) => {
  try {
    if(!fs.existsSync('./public')){
      console.log(`create './public' directory...`);
      fs.mkdirSync('./public');
    };

    if(!fs.existsSync('./public/tmp')){
      console.log(`create './public/tmp' directory...`);
      fs.mkdirSync('./public/tmp');
    };

    const checkChanges = await getSitesChanges(deltaLink, req.session.accessToken);
    
    // await new Promise(resolve => setTimeout(resolve, 10000));

    // const updateToMongo = await deltaCollection.insertOne({
    //   nama: 'pantes gagal terus',
    //   deltalink: 'asd asd asd',
    // });
    // await deltaCollection.deleteMany();
    // res.render('sitesFiles', {
    //   data: {'[system]': 'no changes in SharePoint Sites'},
    // });

    if(checkChanges.length !== 0){
      res.render('sitesFiles', {
        data: checkChanges,
      });
    } else {
      res.render('sitesFiles', {
        data: {'[system]': 'no changes in SharePoint Sites'},
      });
    };
  } catch (error) {
    console.log(error);
    res.render('sitesFiles', {
      data: {'[system]': error},
    });
  };
});

router.get('/delete-all-delta-db', async (req, res) => {
  await deltaCollection.deleteMany();
  res.send('done');
});