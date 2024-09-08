import axios from 'axios';

export async function graphQueryGet(endpoint, accessToken){
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  console.log(new Date().toString(), `: request made to ${endpoint}`);

  try {
    const response = await axios.get(endpoint, options);
    return await response.data;
  } catch (error) {
    throw new Error(error);
  };
};

export async function graphQueryPost(endpoint, body, accessToken){
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  console.log(new Date().toString(), `request made to ${endpoint}`);

  try {
    const response = await axios.post(endpoint, body, options);
    return await response.data;
  } catch (error) {
    throw new Error(error);
  };
};

export async function graphQueryPatch(endpoint, body, accessToken){
  const options = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  console.log(new Date().toString(), `request made to ${endpoint}`);

  try {
    const response = await axios.patch(endpoint, body, options);
    return await response.data;
  } catch (error) {
    throw new Error(error);
  };
};