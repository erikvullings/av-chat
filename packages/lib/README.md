# AV-chat

Audio-video chat library and example over WebRTC using `peerjs`. The library allows you to easily setup a single
peer-to-peer call using audio, video and chat.

## Pre-requisites

As the open `peerjs` server is quite busy, and sometimes down, it might be better to run your own peer server. However,
since we need access to the camera and microphone, which are only accessible under HTTPS, you need to run it using SSL.
For Parcel, this is as simple as adding a `--ssl` command line parameter. For the `peerjs` server, however, you need to
generate an SSL keypair as described [here](https://letsencrypt.org/docs/certificates-for-localhost). Long story short,
you need to run the following command to generate a localhost keypair:

```bash
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

Next, double-click the `localhost.crt` to install it in your local key store. Manually select "Trusted Root
Certification Authorities" as the storage location. Next, restart your browser (all open instances need to be closed
first in order to reload the CAs). Copy the generated `localhost.key` and `localhost.crt` to the current working
directory, and start the `peerjs` server using `npm run server`. Note that this certificate is valid for 1 month only,
so get used to this.

For an alternative approach, consider using the free version of ngrok.

### Using ngrok

[Ngrok](http://ngrok.io/) allows you to create (for free) a single tunnel for your server. Next, you can run the client
and access it over your local network using the IP address of the development server's machine. You have to enable
`parcel` to serve over https as described above.

### Alternatives

Use a service as [serveo](https://serveo.net/#intro) to tunnel local requests via the Internet. In that case, run the
server and expose it externally:

```bash
npm run server
ssh -R 80:localhost:9000 serveo.net # The URL returned should be the host option in the PeerJS initialization call
```

For example:

```json
{
  "host": "volpes.serveo.net",
  "port": 443,
  "path": "/myapp",
  "secure": true,
  "debug": 2
}
```

Next, do the same for the client app

```bash
npm start
ssh -R 80:localhost:1234 serveo.net # The URL returned can be used to access the client
```

## Development

First, install all dependencies:

```bash
npm i # only once to install all dependencies: or use `pnpm i` as a better alternative
```

Next, start the `peerjs` server and parcel by running:

```bash
npm start
```
