# swarming-collab-server

WebSocket relay for multiplayer [swarming](https://www.npmjs.com/package/swarming) sessions.
Peers join a room and share cursors, cameras, node selections, annotations and presenter mode in
real time. The server keeps no database: rooms live in memory and are cleaned up five minutes
after the last peer leaves.

## Run

```bash
npx swarming-collab-server              # listens on ws://0.0.0.0:4444
PORT=8080 npx swarming-collab-server    # custom port
```

Or install it and use the `swarming-collab` binary:

```bash
npm install -g swarming-collab-server
swarming-collab
```

### Docker

The package ships its `Dockerfile`:

```bash
docker build -t swarming-collab node_modules/swarming-collab-server
docker run -p 4444:4444 swarming-collab
```

Put it behind a TLS-terminating proxy and connect clients to `wss://your-host`.

## Protocol

Every message is a JSON object with a `type`.

### Client to server

| `type` | Fields | Effect |
|---|---|---|
| `join` | `room`, `username`, `color?` | Join (or create) a room. Must be sent first. |
| `cursor` | `position: [x, y, z] \| null` | Share the 3D cursor. |
| `camera` | `position: [x, y, z]`, `target: [x, y, z]` | Share the camera. |
| `select` | `nodeId: string \| null` | Share the selected node. |
| `annotate` | `annotation: { nodeId, text, createdAt }` | Add an annotation for the room. |
| `removeAnnotation` | `annotationId` | Remove an annotation. |
| `presenter` | `enabled: boolean` | Take or release presenter mode. |
| `ping` | | Keep-alive; answered with `pong`. |

### Server to client

| `type` | Payload |
|---|---|
| `welcome` | `peerId`, `peers`, `annotations` for the room you joined. |
| `peerJoined` / `peerLeft` | `peer` / `peerId`. |
| `peerUpdate` | `peerId`, `update` (`cursor`, `camera`, `selectedNode`, ...). |
| `annotation` / `annotationRemoved` | `annotation` / `annotationId`. |
| `presenterChanged` | `peerId`, or `null` when nobody presents. |
| `pong` | Reply to `ping`. |

## Example client

```js
const ws = new WebSocket('ws://localhost:4444');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'join', room: 'demo', username: 'ada', color: '#818cf8' }));
  ws.send(JSON.stringify({ type: 'select', nodeId: 'hub-1' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'peerUpdate') console.log(msg.peerId, msg.update);
};
```

## License

Proprietary. See [LICENSE](LICENSE).
