import m from 'mithril';
import { peerService, IPeerConnection, DataConnection } from 'peerjs-av-chat';
import './styles.css';

let peerConnection: IPeerConnection;
let connection: DataConnection;
let avElementRemote: HTMLAudioElement | HTMLVideoElement;
let avElementMine: HTMLAudioElement | HTMLVideoElement;
let peerID: string = '';
let peerIDs: string[] = [];
let message = '';
const messages: string[] = [];

const showStreams = ({ stream, remoteStream }: { stream: MediaStream; remoteStream: MediaStream }) => {
  avElementMine.srcObject = stream;
  const myAudio = stream.getAudioTracks();
  myAudio && myAudio.length > 0 && stream.removeTrack(myAudio[0]);
  avElementMine.play();
  avElementRemote.srcObject = remoteStream;
  avElementRemote.play();
};

const setupConnection = async (id: string) => {
  peerConnection = await peerService.initialize(id, {
    host: 'f5dec6bf20c1.ngrok.io',
    port: 443,
    path: '/myapp',
    secure: true,
    debug: 2,
  });
  peerConnection.on('call', async ({ mediaConnection, accept }) => {
    console.log(`Received a call from ${mediaConnection.peer}. Accepting...`);
    try {
      const call = await accept();
      console.log('Accepted');
      // console.log(JSON.stringify(otherStream.getAudioTracks(), null, 2));
      showStreams(call);
      m.redraw();
    } catch (e) {
      console.error(e);
    }
  });
  peerConnection.on('data', ({ conn, data }) => {
    messages.push(`${conn.peer}: ${data}`);
    m.redraw();
  });
  setInterval(async () => {
    // This will only work if the peerJS server was started with the allow_discovery flag (see package.json)
    peerIDs = await peerConnection?.listAllPeers();
    m.redraw();
  }, 2000);
  m.redraw();
};

const PeerComponent = {
  view: () => {
    return m(
      'main',
      peerID && peerConnection
        ? [
            m('h1', { class: 'title' }, `My id is ${peerConnection.getId()}`),
            m('h2', 'Connected peers'),
            m(
              'ul',
              peerIDs
                .filter((id) => id !== peerID)
                .map((id) =>
                  m('li', [
                    m('span', id),
                    m(
                      'button',
                      {
                        disabled: !message,
                        onclick: async () => {
                          if (peerConnection) {
                            connection = await peerConnection.connect(id);
                            connection.send(message);
                            connection.on('data', ({ data }) => {
                              messages.push(`${id}: ${data}`);
                              m.redraw();
                            });
                          }
                        },
                      },
                      'Send'
                    ),
                    m(
                      'button',
                      {
                        onclick: async () => {
                          try {
                            const call = await peerConnection?.call(id);
                            if (call && call.remoteStream) {
                              console.log('Call accepted');
                              showStreams(call);
                            }
                            // m.redraw();
                          } catch (e) {
                            console.error(e);
                          }
                        },
                      },
                      'Call'
                    ),
                  ])
                )
            ),
            m('input[type=text][placeholder=Enter a message to send]', {
              onchange: (e: any) => {
                message = e.target.value;
              },
            }),
            messages.length > 0 && [
              m('h2', 'Messages received'),
              m(
                'ul',
                messages.map((message) => m('li', `${message}`))
              ),
            ],
            m('.flex-container', [
              m(
                'video[width=320][height=240]',
                {
                  oncreate: ({ dom }) => (avElementMine = dom as HTMLAudioElement | HTMLVideoElement),
                },
                'Your browser does not support the video tag.'
              ),
              m(
                'video[width=320][height=240]',
                {
                  oncreate: ({ dom }) => (avElementRemote = dom as HTMLAudioElement | HTMLVideoElement),
                },
                'Your browser does not support the video tag.'
              ),
            ]),
          ]
        : [
            m('h1', 'Connect to the PeerJS service'),
            m('input[type=text][placeholder=Enter your peer ID]', {
              onchange: (e: any) => {
                peerID = e.target.value;
                setupConnection(peerID);
              },
            }),
          ]
    );
  },
};

m.mount(document.body, PeerComponent);
