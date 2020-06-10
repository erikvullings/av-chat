import Peer, { DataConnection, MediaConnection, PeerJSOption } from 'peerjs';
import { createEventEmitter, Emitter } from './event-emitter';

export interface IPeerConnection
  extends Emitter<{
    call: {
      mediaConnection: Peer.MediaConnection;
      accept: (video?: boolean, audio?: boolean) => Promise<{ stream: MediaStream; remoteStream: MediaStream }>;
    };
    error: any;
    close: null;
    data: any;
  }> {
  getId: () => string;
  /** Get a list of all peers */
  listAllPeers: () => Promise<string[]>;
  /** Connect to a peer by peerID */
  connect: (peerId: string) => Promise<DataConnection>;
  /** Disconnect */
  disconnect: () => void;
  /** Call a peer by peerId */
  call: (
    peerId: string,
    video?: boolean,
    audio?: boolean
  ) => Promise<{ stream: MediaStream; remoteStream: MediaStream }>;
}

const getUserMedia =
  navigator.getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;

const initialize = (peerId: string, options = {} as PeerJSOption) => {
  return new Promise<IPeerConnection>((resolve) => {
    const log = options && options.debug ? console.log : () => {};
    let lastPeerId = '';
    let connections: DataConnection[] = [];

    const eventEmitter = createEventEmitter<{
      call: {
        mediaConnection: MediaConnection;
        accept: (video?: boolean, audio?: boolean) => Promise<{ stream: MediaStream; remoteStream: MediaStream }>;
      };
      error: any;
      /** Emitted when the peer is destroyed and can no longer accept or create any new connections. */
      close: () => void;
      data: { conn: DataConnection; data: any };
    }>();

    const peer = new Peer(peerId, options);

    peer.on('open', (id) => {
      // Workaround for peer.reconnect deleting previous id
      if (!id) {
        log('Received null id from peer open');
        peer.id = lastPeerId;
      } else {
        lastPeerId = id;
      }
      log(`My ID is ${lastPeerId}`);
      resolve({
        getId: () => peer.id,
        listAllPeers,
        connect,
        disconnect,
        call,
        ...eventEmitter,
      });
    });

    peer.on('connection', (c) => {
      // Allow only a single connection
      // if (connections && connections.open) {
      //   c.on('open', () => {
      //     c.send('Already connected to another client');
      //     setTimeout(() => {
      //       c.close();
      //     }, 500);
      //   });
      //   return;
      // }

      log('Connected to: ' + c.peer);
      ready(c);
    });

    peer.on('disconnected', () => {
      log('Connection lost. Please reconnect');

      // Workaround for peer.reconnect deleting previous id
      // peer.id = lastPeerId;
      peer.reconnect();
    });

    peer.on('close', () => {
      connections.length = 0;
      log('Connection destroyed');
      eventEmitter.emit('close');
    });

    peer.on('error', (err) => {
      eventEmitter.emit('error', err);
    });

    peer.on('call', (mediaConnection) => {
      const accept = (video = true, audio = true) =>
        new Promise<{ stream: MediaStream; remoteStream: MediaStream }>((resolve, reject) => {
          getUserMedia(
            { video, audio },
            (stream) => {
              mediaConnection.answer(stream);
              mediaConnection.on('stream', (remoteStream) => {
                resolve({ stream, remoteStream });
              });
            },
            (err) => {
              log('Failed to get local stream', err);
              reject(err);
            }
          );
        });
      eventEmitter.emit('call', { mediaConnection, accept });
    });

    const listAllPeers = () => {
      return new Promise<string[]>((resolve) => {
        peer.listAllPeers(resolve);
      });
    };

    const connect = (peerId: string) => {
      return new Promise<DataConnection>((resolve, reject) => {
        const conn = peer.connect(peerId);
        // on open will launch when you successfully connect to PeerServer
        conn.on('open', () => {
          // here you have conn.ids
          log(`Connection ID: ${JSON.stringify(conn.metadata)}`);
          connections.push(conn);
          // conn.send('hi!');
          resolve(conn);
        });
        conn.on('error', reject);
      });
    };

    const disconnect = () => {
      if (connections) {
        connections.forEach((c) => c.close());
        connections = [];
      }
    };

    /**
     * Triggered once a connection has been achieved.
     * Defines callbacks to handle incoming data and connection events.
     */
    const ready = (conn: DataConnection) => {
      connections.push(conn);
      conn.on('data', (data) => {
        log('Data recieved: ' + data);
        eventEmitter.emit('data', { conn, data });
      });
      conn.on('close', () => {
        connections = connections.filter((c) => c !== conn);
      });
    };

    const call = (peerId: string, video = true, audio = true) => {
      return new Promise<{ stream: MediaStream; remoteStream: MediaStream }>((resolve, reject) => {
        getUserMedia(
          { video, audio },
          (stream) => {
            log('Getting user media');
            log(JSON.stringify(stream.getAudioTracks(), null, 2));
            const call = peer.call(peerId, stream);
            call.on('stream', (remoteStream) => remoteStream && resolve({ stream, remoteStream }));
          },
          (err) => {
            log('Failed to get local stream', err);
            reject(err);
          }
        );
      });
    };
  });
};

export const peerService = {
  initialize,
};
