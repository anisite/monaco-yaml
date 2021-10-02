import './index.css';

import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-yaml/lib/esm/monaco.contribution';
import {
  OutlineModel,
  OutlineElement,
} from 'monaco-editor/esm/vs/editor/contrib/documentSymbols/outlineModel';

// NOTE: This will give you all editor featues. If you would prefer to limit to only the editor
// features you want to use, import them each individually. See this example: (https://github.com/microsoft/monaco-editor-samples/blob/master/browser-esm-webpack-small/index.js#L1-L91)
import 'monaco-editor';

window.MonacoEnvironment = {
  getWorkerUrl(moduleId, label) {
    if (label === 'yaml') {
      return './yaml.worker.bundle.js';
    }
    return './editor.worker.bundle.js';
  },
};

export async function getDocumentSymbols(document, flat, token) {
  return await OutlineModel.create(document, token);
}

const urlParams = new URLSearchParams(window.location.search);

languages.yaml.yamlDefaults.setDiagnosticsOptions({
  validate: true,
  enableSchemaRequest: true,
  hover: true,
  completion: true,
  schemas: [],
});

monaco.editor.setTheme('vs-dark');

const NEVER_CANCEL_TOKEN = {
  isCancellationRequested: false,
  onCancellationRequested: () => Event.NONE,
};

xhr(
  urlGetConfig +
    '/' +
    (urlParams.has('file') ? urlParams.get('file') : '3003cc')
).then(function (res) {
  var editor = monaco.editor.create(document.getElementById('editor'), {
    value: res.responseText,
    tabSize: 2,
    insertSpaces: true,
    language: 'yaml',
  });

  async function getSymbolForPosition(model, position) {
    const symbols = await getDocumentSymbols(model, false, NEVER_CANCEL_TOKEN);

    function find(element) {
      var symbol;
      element.children.forEach((element) => {
        if (element.symbol.range.containsPosition(position)) {
          symbol = element;
          return;
        }
      });
      return symbol;
    }

    function _recur(symbol) {
      var target = symbol;
      if (symbol && symbol.children) {
        target = _recur(find(symbol)) || symbol;
      }
      return target;
    }

    return _recur({ children: symbols.children });
  }

  // Breadcrumbs emulation:
  editor.onDidChangeCursorSelection(async ({ selection }) => {
    var model = editor.getModel();
    var position = selection.getPosition();
    var symbols = await getSymbolForPosition(model, position);
    console.log(symbols);
    //this.setState({ ...this.state, path: symbols.join(" > ") });
  });

  var myBinding = editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
    function () {
      var urlP = new URLSearchParams(window.location.search);
      var guid = urlP.has('file') ? urlP.get('file') : uuidv4();
      if (!guid.startsWith('snapshots@')) {
        guid = uuidv4();
      } else {
        guid = guid.replace('snapshots@', '');
      }
      postToIframe(
        {
          render: b64EncodeUnicode(editor.getValue()),
          currentCursorLine: editor.getPosition().lineNumber,
        },
        urlRenderPost + '?uniqueID=' + guid,
        'formIframe'
      );

      window.history.pushState(null, null, '?file=snapshots@' + guid);
    }
  );

  postToIframe(
    { render: b64EncodeUnicode(editor.getValue()), currentCursorLine: -1 },
    urlRenderPost,
    'formIframe'
  );
});

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

function b64EncodeUnicode(str) {
  // first we use encodeURIComponent to get percent-encoded UTF-8,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(
      match,
      p1
    ) {
      return String.fromCharCode('0x' + p1);
    })
  );
}

function postToIframe(data, url, target) {
  $('body').append(
    '<form action="' +
      url +
      '" method="post" target="' +
      target +
      '" id="postToIframe"></form>'
  );
  $.each(data, function (n, v) {
    $('#postToIframe').append(
      '<input type="hidden" name="' + n + '" value="' + v + '" />'
    );
  });
  $('#postToIframe').submit().remove();
}

function xhr(url) {
  var req = null;
  return new Promise(
    function (c, e) {
      req = new XMLHttpRequest();
      req.onreadystatechange = function () {
        if (req._canceled) {
          return;
        }

        if (req.readyState === 4) {
          if ((req.status >= 200 && req.status < 300) || req.status === 1223) {
            c(req);
          } else {
            e(req);
          }
          req.onreadystatechange = function () {};
        }
      };

      req.open('GET', url, true);
      req.responseType = '';

      req.send(null);
    },
    function () {
      req._canceled = true;
      req.abort();
    }
  );
}
