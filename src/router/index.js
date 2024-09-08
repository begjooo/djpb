import express from 'express';

import { authProvider } from '../auth/provider.js';
import { graphEndPoint, redirectUri } from '../auth/config.js';
import { graphQueryGet } from '../graph.js';
import { getDeltaLink, updateFileSummary } from '../sites.js';
import { deltaCollection } from '../mongodb.js';

export const router = express.Router();

router.get('/', async (req, res, next) => {
  if(!req.session.isAuthenticated){
    res.render('index', {
      title: 'Aplikasi Prototype DJPb',
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.account?.username,
    });
  } else {
    try {
      const accessToken = await authProvider.getToken(req, {
        scopes: [],
        redirectUri: redirectUri,
      });
      console.log(accessToken);

      const deltaDbList = await deltaCollection.find().toArray();
      console.log(deltaDbList);

      let deltaLink = null;
      if(deltaDbList.length === 0){
        const newDeltaLink = await getDeltaLink(accessToken);
        await deltaCollection.insertOne({
          prevDeltaLink: newDeltaLink,
        });
      } else {
      };
      const deltaLinkDb = await deltaCollection.find().toArray();
      console.log(deltaLinkDb);
      deltaLink = {
        id: deltaLinkDb[0]._id,
        prevDeltaLink: deltaLinkDb[0].prevDeltaLink,
      };

      console.log(deltaLink);

      const deltaSites = await graphQueryGet(deltaLink.prevDeltaLink, accessToken);
      const filesChangeList = deltaSites.value;
      console.log(filesChangeList);

      let filesChangeInfo = [];
      if(filesChangeList.length === 0){
        console.log('no files are changed');
      } else {
        // for (let file of filesChangeList){
        //   console.log(file.fields.LinkFilename);
        //   console.log(file.fields.id);
        // };
        filesChangeInfo = filesChangeList.map(file => {
          return {
            listId: file.id,
            name: file.fields.LinkFilename,
            summary: file.fields.Summary,
          };
        });

        console.log(filesChangeInfo);
        filesChangeInfo[0].summary = 'berubah!';
  
        await updateFileSummary(accessToken, filesChangeInfo);
        // get latest delta
        const latestDeltaLink = await getDeltaLink(accessToken);
        // update delta link in mongo db
        await deltaCollection.updateOne(
          { _id: deltaLink.id },
          { $set: { prevDeltaLink: latestDeltaLink } }
        );
      };
    } catch (error) {
      console.log(error);
      throw error;
    };

    res.render('index', {
      title: 'Aplikasi Prototype DJPb',
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.account?.username,
    });
  };
});