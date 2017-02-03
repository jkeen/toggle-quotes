'use babel'

export const toggleQuotes = (editor) => {
  editor.transact(() => {
    for (let cursor of editor.getCursors()) {
      let position = cursor.getBufferPosition();
      toggleQuoteAtPosition(editor, position, cursor);
      cursor.setBufferPosition(position);
    }
  });
};

const getNextQuoteCharacter = (quoteCharacter, allQuoteCharacters) => {
  let index = allQuoteCharacters.indexOf(quoteCharacter)
  if (index === -1) {
    return null
  } else {
    return allQuoteCharacters[(index + 1) % allQuoteCharacters.length]
  }
}

const isQuotedText = (editor, text) => {
  let quoteChars = atom.config.get('toggle-quotes.quoteCharacters');
  let inner      = quoteChars.split('').map(character => `${character}.*${character}`).join('|')
  return RegExp(`^(${inner})$`, 'g').test(text);
}

const testScope = (editor, position, scope) => {
  let range = editor.bufferRangeForScopeAtPosition(scope, position);
  if (range) {
    let text = editor.getTextInBufferRange(range);
    if (text) {
      return isQuotedText(editor, text);
    }
  }
  return false;
}

const doQuoteReplacement = (editor, range) => {
  let quoteChars = atom.config.get('toggle-quotes.quoteCharacters');
  let text       = editor.getTextInBufferRange(range)

  let [quoteCharacter] = text

  // In Python a string can have a prefix specifying its format. The Python
  // grammar includes this prefix in the string, and thus we need to exclude
  // it when toggling quotes
  debugger
  let prefix = ''
  if (/[uUr]/.test(quoteCharacter)) {
    [prefix, quoteCharacter] = text
  }

  let nextQuoteCharacter = getNextQuoteCharacter(quoteCharacter, quoteChars)

  if (!nextQuoteCharacter) {
    return
  }

  // let quoteRegex = new RegExp(quoteCharacter, 'g')
  let escapedQuoteRegex = new RegExp(`\\\\${quoteCharacter}`, 'g')
  let nextQuoteRegex    = new RegExp(nextQuoteCharacter, 'g')

  let newText = text
    .replace(nextQuoteRegex, `\\${nextQuoteCharacter}`)
    .replace(escapedQuoteRegex, quoteCharacter)

  newText = prefix + nextQuoteCharacter + newText.slice(1 + prefix.length, -1) + nextQuoteCharacter

  editor.setTextInBufferRange(range, newText)
}

const toggleQuoteAtPosition = (editor, position, cursor) => {
  let quoteChars  = atom.config.get('toggle-quotes.quoteCharacters');
  let range, text;
  let scopesToTry = ['.string.quoted'].concat(cursor.getScopeDescriptor().getScopesArray()).concat(['.invalid.illegal']);

  // .string.quoted is the ideal case
  // .invalid.illegal is useful for languages where changing the quotes makes the range
  // invalid and so toggling again should properly restore the valid quotes

  let replacementSuccess = false;
  scopesToTry.forEach(scope => {
    if (testScope(editor, position, scope)) {
      // found our best scope, a quoted string as reported by the grammar
      let range = editor.bufferRangeForScopeAtPosition(scope, position)
      let text  = editor.getTextInBufferRange(range)

      console.log(`[toggle-quotes] found quoted region in scope '${scope}'`);
      console.log(`[toggle-quotes] replaced surrounding quotes in region: ${text}`);
      doQuoteReplacement(editor, range);
      replacementSuccess = true;
      return;
    }
  });

  if (!replacementSuccess) {
    console.log(`[toggle-quotes] found no quoted strings in the following scopes: ${scopesToTry.join(', ')}`)
    // no dice
  }
}
