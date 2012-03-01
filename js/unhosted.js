require(['./js/remoteStorage'], function(remoteStorage) {
  var connected = false;
  var authorized = false;

  function connect(userAddress, callback) {
    // `getStorageInfo` takes a user address ("user@host") and a callback as
    // its arguments. The callback will get an error code, and a `storageInfo`
    // object. If the error code is `null`, then the `storageInfo` object will
    // have some data fields in it that we will need later.
    remoteStorage.getStorageInfo(userAddress, callback);
  }

  function getData(category, key, callback) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var client;

    if (category === 'public') {
      client = remoteStorage.createClient(storageInfo, 'public');
    } else {
      var token = localStorage.getItem('bearerToken');
      client = remoteStorage.createClient(storageInfo, category, token);
    }

    client.get(key, callback);
  }

  function putData(category, key, value, callback) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var token = localStorage.getItem('bearerToken');
    var client = remoteStorage.createClient(storageInfo, category, token);

    client.put(key, value, callback);
  }

  // Getting public data is easy because it requires no credentials. If we want
  // to write to a user's public data, or read or write from one of the other
  // categories, we need to do an OAuth request first to obtain a token. Our
  // library provides two functions to make this easier.

  // Open a popup that sends the user to the OAuth dialog of the remoteStorage
  // provider.
  function authorize(categories) {
    var storageInfo = JSON.parse(localStorage.getItem('userStorageInfo'));
    var redirectUri = location.protocol + '//' + location.host + '/receive_token.html';
    var oauthPage = remoteStorage.createOAuthAddress(storageInfo, categories, redirectUri);
    var popup = window.open(oauthPage);
  }

  // Listen for the `message` event from the receive_token.html that sends the
  // OAuth token.
  window.addEventListener('message', function(event) {
    if(event.origin == location.protocol +'//'+ location.host) {
      console.log('Received an OAuth token: ' + event.data);
      localStorage.setItem('bearerToken', event.data);
      setAuthorizedState(true);
    }
  }, false);


  // Helper functions

  function showSpinner(id) {
    document.getElementById(id).className = '';
  }

  function hideSpinner(id) {
    document.getElementById(id).className = 'hidden';
  }

  function setConnectionState(state) {
    if (connected != state)
      console.log('Switching connection state to ' + state);
    connected = state;

    elementIds = [
      'publicKey', 'fetchPublicKey', 'authorize', 'disconnect'
    ];

    if (connected) {
      for (var i = 0; i < elementIds.length; i++) {
        document.getElementById(elementIds[i]).disabled = null;
      }
      document.getElementById('connect').className = 'hidden';
      document.getElementById('disconnect').className = '';
    } else {
      for (var i = 0; i < elementIds.length; i++) {
        document.getElementById(elementIds[i]).disabled = 'disabled';
      }
      document.getElementById('connect').className = '';
      document.getElementById('disconnect').className = 'hidden';
      deauthorize();
    }
  }

  function disconnect() {
    localStorage.removeItem('userStorageInfo');
    setConnectionState(false);
  }

  function isConnected() {
    state = localStorage.getItem('userStorageInfo') != null;
    console.log('Current connection state: ' + state);
    return state;
  }

  function setAuthorizedState(state) {
    if (authorized != state)
      console.log('Switching authorized state to ' + state);
    authorized = state;

    elementIds = [
      'tutorialKey', 'fetchTutorialKey', 'tutorialValue',
      'publishTutorial', 'publicValue', 'publishPublic', 'deauthorize'
    ];

    if (authorized) {
      for (var i = 0; i < elementIds.length; i++) {
        document.getElementById(elementIds[i]).disabled = null;
      }
      document.getElementById('publicTitle').innerHTML = 'Read/write access for "public" category';
      document.getElementById('authorize').className = 'hidden';
      document.getElementById('deauthorize').className = '';
    } else {
      for (var i = 0; i < elementIds.length; i++) {
        document.getElementById(elementIds[i]).disabled = 'disabled';
      }
      document.getElementById('publicTitle').innerHTML = 'Read access for "public" category';
      document.getElementById('authorize').className = '';
      document.getElementById('deauthorize').className = 'hidden';
    }
  }

  function deauthorize() {
    localStorage.removeItem('bearerToken');
    setAuthorizedState(false);
  }

  function isAuthorized() {
    state = localStorage.getItem('bearerToken') != null;
    console.log('Current authorized state: ' + state);
    return state;
  }

  // Bind the UI elements to the actions

  document.getElementById('connect').onclick = function() {
    var userAddress = document.getElementById('userAddress').value;

    showSpinner('connectionSpinner');

    connect(userAddress, function(error, storageInfo) {
      if(error) {
        console.log('Could not load storage info');
        console.log(error);
        setConnectionState(false);
      } else {
        console.log('Storage info received:');
        console.log(storageInfo);
        localStorage.setItem('userStorageInfo', JSON.stringify(storageInfo));
        setConnectionState(true);
      }

      hideSpinner('connectionSpinner');
    });

    return false;
  }

  document.getElementById('fetchPublicKey').onclick = function() {
    var key = document.getElementById('publicKey').value;

    showSpinner('fetchPublicSpinner');

    getData('public', key, function(error, data) {
      if(error) {
        console.log('Could not find "' + key + '" in category "public" on the remoteStorage');
        console.log(error);
      } else {
        if (data == "null") {
          console.log('There wasn\'t anything for "' + key + '" in category "public"');
        } else {
          console.log('We received this for key "' + key + '" in category "public": ' + data);
        }
      }

      hideSpinner('fetchPublicSpinner');
    });

    return false;
  }

  document.getElementById('publishPublic').onclick = function() {
    var key = document.getElementById('publicKey').value;
    var value = document.getElementById('publicValue').value;

    showSpinner('publishPublicSpinner');

    putData('public', key, value, function(error) {
      if (error) {
        console.log('Could not store "' + key + '" in "public" category');
      } else {
        console.log('Stored "' + value + '" for key "' + key + '" in "public" category');
      }

      hideSpinner('publishPublicSpinner');
    });

    return false;
  }

  document.getElementById('authorize').onclick = function() {
    authorize(['public', 'tutorial']);
    return false;
  }

  document.getElementById('publishTutorial').onclick = function() {
    var key = document.getElementById('tutorialKey').value;
    var value = document.getElementById('tutorialValue').value;

    showSpinner('publishTutorialSpinner');

    putData('tutorial', key, value, function(error) {
      if (error) {
        console.log('Could not store "' + key + '" in "tutorial" category');
      } else {
        console.log('Stored "' + value + '" for key "' + key + '" in "tutorial" category');
      }

      hideSpinner('publishTutorialSpinner');
    });

    return false;
  }

  document.getElementById('fetchTutorialKey').onclick = function() {
    var key = document.getElementById('tutorialKey').value;

    showSpinner('fetchTutorialSpinner');

    getData('tutorial', key, function(error, data) {
      if(error) {
        console.log('Could not find "' + key + '" in category "tutorial" on the remoteStorage');
        console.log(error);
      } else {
        if (data == "null") {
          console.log('There wasn\'t anything for "' + key + '" in category "tutorial"');
        } else {
          console.log('We received this for key "' + key + '" in category "tutorial": ' + data);
        }
      }

      hideSpinner('fetchTutorialSpinner');
    });

    return false;
  }

  document.getElementById('disconnect').onclick = function() {
    disconnect();
    return false;
  }

  document.getElementById('deauthorize').onclick = function() {
    deauthorize();
    return false;
  }

  setConnectionState(isConnected());
  setAuthorizedState(isAuthorized());
});
