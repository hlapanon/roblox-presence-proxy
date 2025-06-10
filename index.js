const axios = require('axios');

// Configuration
const placeId = 13878581115; // Primary place ID (Tower Defense Simulator)
const fallbackPlaceId = 14184086618; // Fallback place ID (Adopt Me!)
const accounts = [
  { username: 'halop_11', cookie: process.env.COOKIE_1 || '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_GgIQAQ.4DB1EE17EDEFEE5814287B304401E06029BCA362482C344FCA64FB911F89886DC02BB5B9F0127E1C3D0387E36D2D998D3E2B4BF345204009F20FEE4B7631ADB9C513315C064DA0B9F9B0ADE37006401DC64E9F10B2542EAB59C5674F7870D991FAC36EF75344C8F8E757701A39AF0DC98036E123394C07193EA79894AD709A11DF741153D4BAC67FE593CB23A6AC9E64EBCD975CCC5445AFE5ADF8E989E616BB707AE1136906152BA1D54A04907CDF1351A0F3C55FC0488AB02D2573003824C9B6E5D134D3065AB8169752D42FB3C464A1A4FD92AC63122F171FF9FD35F78775B237A42954E66CFF2A1D0DB94B856D5EAA719132EE3FE458CCC8B8F5A13EA9EE3534ECFA9DD26A0B247CF7785B7767B81657DEC9A08BA84F7992066BE4A95AD33591F8642AA9634CF7B635A79C1B430D3024CFA5865AF97509DD935A83A0B35875E64630ADC228031D6FFCF7F3286590973F855D8A7B4B90D787494E91601916A56D9A1A55375DCAD0EE8825CD4FFC2FF1D999EDFEE000FC6752F181CEA8D35E8465A3664E5A8B165EED75145205A386823361EE4F447B3AEBD47AAF8925FCC7165B3660E1CDE136B3F71B51D7E182BDF47EF09ABCDBF98B78A02D7D6AD4CB819A73ED7016962AE88A84F8D709A03CDAD78AD31EAF04DC15DB527140C838928BDE43B6A8A6CC5CB4FA4D34211DCF431A220F48A5E3344A8D40FF311F2922A232B319096F541ADFF98F0FBB1D1CE821749743237D4EEFCCCBA6BE48D3716285376546DF2DA6BB2DAE6068F474FF95D439CB8EBE6A4A2EBF6F8C33AF9FD9B1C72172CB4033B2F8F09C5C8F761A990F8F336EDDB89BC6180F219D4D2BC2B68BB4E8A1D3B88A7EC044B065FBC1EF3A674BB74F7AF1B0FA5BB13718A9D5EE521A1E080618A3DFB0E00E2713CEE87C6CD3774CB278C528E420228459C25CCE89E49D1E50996C3A5D321C29401602322C64071FF84CCF249C33BC2597A5FD5B84C922C20630EFA14C4E133EE40DF97EF8E522541892CC1AE8B876C888D3A1CBAC6A93E8A1FB9E050289F1C6FD76187B2FE6D36D7C65FC93E5BCEBC9FFB490B2F9490E20849BCA23320A33644F6DC6B2FD9EADE4B2762F6D' },
  { username: 'halop_17', cookie: process.env.COOKIE_2 || '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_GgIQAQ.D9F0809FCF1D795D77A4E08AD3B6C0361B301CC1A20C396A5B8C5D4D78BDBFB3FF34BDCE275D8A84854FA583D9A0EEB05B8FCAF10362421A89C3E4105D1E9406EA1DCC6BBC9CA3A316E9230084B8EC82F224A9998C2D78D4B8F80FB2D5FC46AC1E93C01CEE38E1D27321FC82BF36B1B4FBB4C4FF95BFB088DFCD5C2F19671D62B7FF7B775EAD5AB19F14032FF33CFAE32FCEEFB8702BA0988438764A42E5CF74B27E34142CD4E774F44E91DEF1D807521EB4E75CBB44AF83550B1900548CAADE9DAEE42AF8F35110168884620B40EE3E5BDCE287E46C13B9C8FA67EBCF04D5CF0321C63DDEA8781BFB89E2F0EEDDEAB2119B69119DBFE2E0BD946CFB96D9726938154A43BFFC8B5462214DB20F94FC341802CD5516E928822674707B1DAF0B93F5F9A34E51779F0AEFBC389B8C5FB343A5D3B84C0C4FF651252DE5954C9EBDFE986344FCC9A98B63ADB1C0EB3F39AAEE8C353B42FF8A1EFF51E312C9BEBFE16E5BFD558A1138FC9B5B2E1BB291192593324B9F7BED869F2056892A263E1EB2BB2625AB6EAD0CA29BD574FD11F910DD0031894DFB0B1B0A1C20F370AFB9909FE213B67FA8F09B025A21DA371389BB06D0C66349DFB03224FD299F3681C058C8B553F35307618831BF11F4B883DEAAF41D593276255F95D32740FEF2C95AAA0B46D6D129B8A623C97EFB72CAA84A4DD45A6002AC16F94BD3BF1C2E0090516AB584EC43936153F8DB37266C166BCB39B6ED9BF35B8A67223B4AEA130BD076492429E40144E8238EBAA2D84B609D3FFD23D7E00C69F6C95EA6369D56C6DBBD198DAE60E5D7B834756E29816378FF61E43447F95F86900CD9540B4D99586E59889591A26B1BC0AAA9BF184AC0667F53E33E69473C2B157E83E90F79FDF1C419B6C02FAC700F6F6F2BF8FF828FE39618F7FDF81530A83A9912D70EC563F57E27AEE013A4A465151F040968629EF3BA17E68B2A26949B2F0BE8E78670A48B9A17AF074DBC2A3407578775281E7BBAA866A7D1BA98592A684193D970D1D4DBE54007CD283FFC9D7798A51BB6A3B98150C60D749A3B2DB063348A31BFE4E8CBA51350F52891A9815623F00343F755F6A07F8BD7765672A93A },
];

// Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Validate cookie
async function validateCookie(cookie) {
  try {
    const response = await axios.get('https://users.roblox.com/v1/users/authenticated', {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Cookie validation failed: ${error.message}`);
  }
}

// Get all available game servers
async function getGameServers(placeId) {
  try {
    const response = await axios.get(`https://games.roblox.com/v1/games/${placeId}/servers/0`, {
      params: { limit: 100 }
    });
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to get game servers: ${error.message}`);
  }
}

// Get CSRF token
async function getCsrfToken(cookie) {
  try {
    const response = await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    return response.headers['x-csrf-token'];
  } catch (err) {
    if (err.response && err.response.headers['x-csrf-token']) {
      return err.response.headers['x-csrf-token'];
    }
    throw new Error('Failed to get CSRF token');
  }
}

// Attempt to join game
async function attemptJoin(account, placeId, serverId = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to join place ${placeId} with ${account.username}${serverId ? ` (server ${serverId})` : ''}...`);
      const csrfToken = await getCsrfToken(account.cookie);
      console.log(`CSRF token obtained for ${account.username}`);

      const payload = {
        placeId: placeId,
        isTeleport: false
      };
      if (serverId) payload.gameId = serverId;

      const joinResponse = await axios.post('https://gamejoin.roblox.com/v1/join-game', payload, {
        headers: {
          'Cookie': `.ROBLOSECURITY=${account.cookie}`,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`${account.username} received ${joinResponse.status} status for joining place ${placeId}`);
      console.log(`Join response data: ${JSON.stringify(joinResponse.data)}`);

      if (joinResponse.data.status === 2 || joinResponse.data.joinScriptUrl || joinResponse.data.authenticationTicket) {
        console.log(`${account.username} successfully initiated join for place ${placeId}`);
        return { success: true, data: joinResponse.data };
      } else {
        console.error(`Join failed with status ${joinResponse.data.status}: ${joinResponse.data.message}`);
        if (attempt < retries) {
          console.log(`Retrying after 10 seconds...`);
          await delay(10000); // Increased delay to avoid rate limits
        }
      }
    } catch (error) {
      console.error(`Error on attempt ${attempt} for ${account.username}: ${error.message}`);
      if (error.response) {
        console.error(`Response details: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      if (attempt < retries) {
        console.log(`Retrying after 10 seconds...`);
        await delay(10000);
      }
    }
  }
  return { success: false };
}

// Bot account logic
async function botAccount(account, currentPlaceId) {
  try {
    console.log(`Validating cookie for ${account.username}...`);
    const userInfo = await validateCookie(account.cookie);
    console.log(`Cookie valid for ${account.username} (ID: ${userInfo.id}, Name: ${userInfo.name})`);

    console.log(`Checking available servers for place ${currentPlaceId}...`);
    let servers = await getGameServers(currentPlaceId);
    console.log(`Found ${servers.length} server(s) for place ${currentPlaceId}`);
    servers.forEach((server, index) => {
      console.log(`Server ${index + 1}: ID=${server.id}, Players=${server.playing}/${server.maxPlayers}, Full=${server.playing >= server.maxPlayers}`);
    });

    if (servers.length === 0) {
      console.error(`No servers found for place ${currentPlaceId}. Retrying up to 3 times...`);
      for (let i = 0; i < 3; i++) {
        await delay(10000);
        servers = await getGameServers(currentPlaceId);
        console.log(`Retry ${i + 1}: Found ${servers.length} server(s) for place ${currentPlaceId}`);
        servers.forEach((server, index) => {
          console.log(`Server ${index + 1}: ID=${server.id}, Players=${server.playing}/${server.maxPlayers}, Full=${server.playing >= server.maxPlayers}`);
        });
        if (servers.length > 0) break;
      }
      if (servers.length === 0) {
        console.error(`No servers available for place ${currentPlaceId} after retries`);
        return { success: false, reason: 'No servers available' };
      }
    }

    // Try joining without specific server
    let result = await attemptJoin(account, currentPlaceId);

    // Try specific server if available
    if (!result.success && servers.length > 0) {
      const serverId = servers[0].id;
      console.log(`Trying to join specific server ${serverId} for place ${currentPlaceId}...`);
      result = await attemptJoin(account, currentPlaceId, serverId);
    }

    if (!result.success) {
      console.error(`All join attempts failed for ${account.username}`);
      return { success: false, reason: 'All join attempts failed' };
    } else {
      console.log(`Join details: ${JSON.stringify(result.data)}`);
      return { success: true, data: result.data };
    }
  } catch (error) {
    console.error(`Error with ${account.username}: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

// Main function
async function runBots() {
  for (const account of accounts) {
    console.log(`Processing bot for ${account.username}...`);
    let result = await botAccount(account, placeId);
    if (!result.success) {
      console.log(`Primary place ${placeId} failed for ${account.username}. Trying fallback place ${fallbackPlaceId}...`);
      result = await botAccount(account, fallbackPlaceId);
    }
    if (!result.success) {
      console.error(`Bot for ${account.username} failed: ${result.reason}`);
    }
    await delay(10000); // Delay between accounts
  }
  console.log('All bots have completed one cycle.');
}

// Run bots continuously for Background Worker
async function runBotsContinuously() {
  console.log('Starting continuous bot operation...');
  while (true) {
    try {
      await runBots();
      console.log('Completed one cycle. Waiting 60 seconds before next run...');
      await delay(60000); // Pause 60 seconds between cycles
    } catch (err) {
      console.error('Error in continuous run:', err);
      console.log('Retrying after 30 seconds...');
      await delay(30000); // Shorter delay on error to retry
    }
  }
}

// Start botting
runBotsContinuously().catch(err => console.error('Botting process failed:', err));
