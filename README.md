# dcloud-collab-toolbot

This is a Webex chat bot that supports some administration tasks for the dCloud
Collaboration Toolbox. It is built using Node.js and Express.js.

#### Install

Clone this repository:

`git clone https://github.com/ccondry/dcloud-collab-toolbot.git`

Install onto linux server:

```sh
cd dcloud-collab-toolbot
./install.sh
```

#### Run in development

```sh
npm start
```
OR
```sh
yarn start
```

#### Run in production

Restart service:

```sh
systemctl restart collab-toolbot.service
```

Watch service logs:

```sh
journalctl -xef -u collab-toolbot.service
```
