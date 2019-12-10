let langs = ['en'];

function urlParam(sParam, defaultVal = undefined) {
  let sPageURL = window.location.search.substring(1);
  let sURLVariables = sPageURL.split('&');
  for (let i = 0; i < sURLVariables.length; i++) {
    let sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam)
      return sParameterName[1];
  }
  return defaultVal;
}

function getLang() {
  return urlParam('lang', 'en');
}

let _lang = getLang();

function showCurrentLang() {
  $('.' + _lang).show();
}

function getLocalStorage(key, defaultVal = undefined) {
  let val = localStorage.getItem(key);
  return val ? val : defaultVal;
}

function setLocalStorage(key, val) {
  localStorage.setItem(key, val);
}
