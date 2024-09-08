import { MongoClient, ServerApiVersion } from 'mongodb';

export let deltaCollection = null;

const deltaDbName = 'delta-link-db';
const deltaCollectionName = 'delta-link';

const uri = "mongodb+srv://begjooo:qwe@djpb-2024.pywwm.mongodb.net/?retryWrites=true&w=majority&appName=djpb-2024";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function runMongoDb(){
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your MongoDB deployment. You successfully connected to MongoDB!");

    deltaCollection = client.db(deltaDbName).collection(deltaCollectionName);
    
    return true;
  } catch (error) {
    return false;
  };
};

export async function closeMongoConnection(){
  try {
    await client.close();
    return true;
  } catch (error) {
    return false;
  };
};