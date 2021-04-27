const Discord = require('discord.js');
const cron = require('node-cron');
const { token } = require('./config.json');

const data = new Map();

const client = new Discord.Client();

client.once('ready', () => console.log('status: ready'));
client.once('reconnecting', () => console.log('status: reconnecting'));
client.once('disconnect', () => console.log('status: disconnect'));

client.on('message', async message => {
  if (message.author.bot) return;

  const serverData = data.get(message.guild.id);

  if (message.content.startsWith('!posture')) {
    const args = message.content.split(' ');
    switch (args[1]) {
      case 'channel': {
        channel(message, serverData);
      }
      case 'stop': {
        stop(message, serverData);
      }
      default: {
        postureCheck(message, serverData);
      }
    }
  } 
});

async function checkChannel(message, serverData) {
  if (serverData.voiceChannel) {
    return message.channel.send(
      `Posture checking ${serverData.voiceChannel.name}`
    );
  } else {
    return message.channel.send(
      'Not posture checking any voice channel right now'
    );
  }
}

async function stop(message, serverData) {
  if (serverData.job) {
    serverData.job.stop();
    return message.channel.send('Posture checking stopped');
    data.set(message.guild.id, {});
  } else {
    return message.channel.send(
      'Not posture checking right now.'
    );
  }
}

async function postureCheck(message, serverData) {

  if (!serverData || !serverData.job) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send(
        'You need to be in a voice channel to check your posture!'
      );
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send(
        'I need the permissions to join and speak in your voice channel!'
      );
    }

    const job = cron.schedule('*/30 * * * *', async () => {
      const serverData = data.get(message.guild.id);
      const voiceChannel = await serverData.voiceChannel.fetch();
      if (voiceChannel.members.size === 0) {
        job.stop();
        data.set(message.guild.id, {});
        return;
      }
      data.set(message.guild.id, { ...serverData, voiceChannel });
      await playSound(voiceChannel);
    }, null, true, 'America/Toronto', false, );

    data.set(message.guild.id, { voiceChannel, job });

    message.channel.send(`I will posture check **${voiceChannel.name}** every 30 minutes`);

    await playSound(voiceChannel);

  } else {
    const voiceChannel = message.member.voice.channel;
    if (voiceChannel.id !== serverData.voiceChannel.id) {
      data.set(message.guild.id, { serverData, ...voiceChannel });
      message.channel.send(`I will posture check **${voiceChannel.name}** every 30 minutes.`);
      await playSound(voiceChannel);
    } else {
      message.channel.send(`Already posture checking **${voiceChannel.name}** every 30 minutes.`);
    }

  }
}

async function playSound(voiceChannel) {
  const connection = await voiceChannel.join();
  const volume = 5;
  const dispatcher = connection
    .play('./sound.wav')
    .on('finish', () => {
      connection.disconnect();
    })
    .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(volume / 5);
}

client.login(token);
