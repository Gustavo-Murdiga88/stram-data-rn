import {
  AuthRequest,
  AuthSessionResult,
  makeRedirectUri,
  revokeAsync,
  startAsync,
} from "expo-auth-session";
import React, {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { generateRandom } from "expo-auth-session/build/PKCE";
import * as WebBrowser from 'expo-web-browser';

import { api } from "../services/api";
import { Alert } from "react-native";

interface User {
  id: number;
  display_name: string;
  email: string;
  profile_image_url: string;
}

interface AuthContextData {
  user: User;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderData {
  children: ReactNode;
}

const AuthContext = createContext({} as AuthContextData);

const twitchEndpoints = {
  authorization: "https://id.twitch.tv/oauth2/authorize",
  revocation: "https://id.twitch.tv/oauth2/revoke",
};

WebBrowser.maybeCompleteAuthSession();

function AuthProvider({ children }: AuthProviderData) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState({} as User);
  const [userToken, setUserToken] = useState("");

  // get CLIENT_ID from environment variables
  const { CLIENT_ID } = process.env;

  async function signIn() {
    try {
      // set isLoggingIn to true
      setIsLoggingIn(true);
      const REDIRECT_URI = makeRedirectUri({ scheme: 'stream.data',useProxy: true });
      const RESPONSE_TYPE = "token";
      const SCOPE = encodeURI("openid user:read:email user:read:follows");
      const FORCE_VERIFY = true;
      const STATE = generateRandom(30);

      const authUrl =
        twitchEndpoints.authorization +
        `?client_id=1jib1zlrdn4d7gccr4q0oj859a8avc` +
        `&redirect_uri=${REDIRECT_URI}` +
        `&response_type=${RESPONSE_TYPE}` +
        `&scope=${SCOPE}` +
        `&force_verify=${FORCE_VERIFY}` +
        `&state=${STATE}`;

        const {type, params} = await startAsync({
          authUrl: authUrl
        }) as AuthSessionResult & { params:{
          access_token: string
        } }

        if(type === 'success'){
          api.defaults.headers.common['Authorization'] = 'Bearer ' + params.access_token;

          debugger;
          setUserToken(params.access_token)
        }
        if(params.access_token){

        const { data } =  await api.get('users')
        if(data.data[0]){
          setUser(data.data[0])
        }
      }
      } catch (error) {
      // throw an error
      console.log(error)
      Alert.alert('Erro ao buscar informações')
      throw(error)
    } finally {
      // set isLoggingIn to fals
      setIsLoggingIn(false)
    }
  }

  async function signOut() {
    try {
      // set isLoggingOut to true
      setIsLoggingOut(true);
      revokeAsync({
        token: userToken,
        clientId: CLIENT_ID,
      }, {
        revocationEndpoint: twitchEndpoints.revocation
      })
      // call revokeAsync with access_token, client_id and twitchEndpoint revocation
    } catch (error) {
      throw(error)
    } finally {

      setUser({} as User);
      setUserToken('');
      delete api.defaults.headers.common['Authorization'];
      setIsLoggingOut(false)

    }
  }

  useEffect(() => {
    // add client_id to request's "Client-Id" header
    api.defaults.headers.common["Client-Id"] = '1jib1zlrdn4d7gccr4q0oj859a8avc';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoggingOut, isLoggingIn, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth };
