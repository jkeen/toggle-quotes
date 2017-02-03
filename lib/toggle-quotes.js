'use babel';

export const toggleQuotes = (editor) => {
  editor.transact(() => {
    for (let cursor of editor.getCursors()) {
      toggleQuoteAtCursor(editor, cursor);
    }
  });
};

const toggleQuoteAtCursor = (editor, cursor) => {
  let quoteChars  = atom.config.get('toggle-quotes.quoteCharacters');
  let position    = cursor.getBufferPosition();
  let range, text;

  let matches = findQuotesOnCurrentLine(editor, cursor).sort((m, n) => m.distance > n.distance); // sort from innermost match to outermost

  if (matches.length == 1) {
    // we're only in one quoted region
    // 'the quick brown fox jumped over the "lazy" dog'
    // -----------------------|------------------------

    // TODO: maybe modify the double quotes on "lazy" in the same go if we change singles to doubles

    let innerMatch = matches[0];
    let nextQuoteCharacter = getNextQuoteCharacter(innerMatch.char, quoteChars)
    let newText = replaceMatchWithNewQuote(cursor.getCurrentBufferLine(), innerMatch.left, innerMatch.right, nextQuoteCharacter);
    editor.setTextInBufferRange(cursor.getCurrentLineBufferRange(), newText)
  }
  else if (matches.length > 1) {
    //  we're in the middle of multiple quotes:
    // 'the quick brown fox jumped over the "lazy" dog'
    // ----------------------------------------|-------

    console.log("multiple match 'region'")

    let innerMatch = matches[0];
    let outerMatch = matches[1];

    if (outerMatch.char === innerMatch.char) {
      newText = replaceMatchWithNewQuote(cursor.getCurrentBufferLine(), innerMatch.left, innerMatch.right,  getNextQuoteCharacter(innerMatch.char, quoteChars));
      editor.setTextInBufferRange(cursor.getCurrentLineBufferRange(), newText)
    }
    else {
      newText = replaceMatchWithNewQuote(cursor.getCurrentBufferLine(), innerMatch.left, innerMatch.right,  getNextQuoteCharacter(innerMatch.char, quoteChars));
      editor.setTextInBufferRange(cursor.getCurrentLineBufferRange(), newText)

      newText = replaceMatchWithNewQuote(cursor.getCurrentBufferLine(), outerMatch.left, outerMatch.right,  getNextQuoteCharacter(outerMatch.char, quoteChars));
      editor.setTextInBufferRange(cursor.getCurrentLineBufferRange(), newText)
    }

    // let innerMatch = matches[0];
    // let nextQuoteCharacter = getNextQuoteCharacter(bestMatch.char, quoteChars)
    // newText = replaceMatchWithNewQuote(text, innerMatch.left, innerMatch.right, newQuoteCharacter);
    // editor.setTextInBufferRange(cursor.getCurrentLineBufferRange(), newText)
    //
  }
  else {
    //nothing
  }

  cursor.setBufferPosition(position);
}

/* Helper functions */


const replaceMatchWithNewQuote = (text, left, right, newChar) => {
  let before  = text.slice(0, left);
  let between = text.slice(left + 1, right);
  let after   = text.slice(right + 1, text.length);
  let newText = `${before}${newChar}${between}${newChar}${after}`

  if (true) {

  }

  return newText;
}

const getNextQuoteCharacter = (quoteCharacter, allQuoteCharacters) => {
  let index = allQuoteCharacters.indexOf(quoteCharacter)
  if (index === -1) {
    return null
  } else {
    return allQuoteCharacters[(index + 1) % allQuoteCharacters.length]
  }
}

const findQuotesOnCurrentLine = (editor, cursor) => {
  // Find quotes on current line, returns list of match objects

  // If line = "the quick brown 'fox' jumps over the lazy dog"
  // _____________________________|___________________________
  // Match = {char: "'", left: 17, right: 20, distance: 1}
  // keys:
  //  char: "'"
  //  left: 17 // index of left quote
  //  right: 20 // index of right quote
  //  distance: 1, cursor distance away from closest quote in question

  let quoteChars = atom.config.get('toggle-quotes.quoteCharacters').split('');
  let text       = cursor.getCurrentBufferLine()
  let position   = cursor.getBufferPosition();

  let quoteMaps = quoteChars.map(char => {
    return {
      char: char,
      indicies: findIndiciesInText(char, text)
    };
  }).filter(qm => {
    return qm.indicies.length > 1; // needs to be at least two quotes to toggle
  });

  let cursorColumn = position.column;
  let matches = [];

  quoteMaps.forEach(quoteMap => {
    let char    = quoteMap.char;
    let columns = quoteMap.indicies;

    for(var j=0; j < columns.length; j++) {
      matches = matches.concat(findInnerMostQuotes(char, columns, cursorColumn))

      let matchedPositions = [];
      matches.forEach(m => {
        matchedPositions.push(m.left);
        matchedPositions.push(m.right);
      })

      columns = columns.filter(i => (matchedPositions.indexOf(i) === -1));

      if (columns.length === 0) {
        break;
      }
    }
  });

  return matches;
}

const findInnerMostQuotes = (char, columns, cursorColumn) => {
  // Given a character and some coordinates and a cursor position, it finds the sets of matching quotes starting from the inside
  let matches = [];
  for(var i = 0; i < columns.length; i++) {
    let leftColumn  = columns[i];
    let rightColumn = columns[i+1];

    // Find the closest set of quotes with the cursor between them
    if (cursorColumn > leftColumn && rightColumn && cursorColumn <= rightColumn) {
      matches.push({
        char: char,
        left: leftColumn,
        right: rightColumn,
        distance: Math.min((cursorColumn - leftColumn), (rightColumn - cursorColumn))
      });
    }
  }

  return matches;
}

const findIndiciesInText = (char, text) => {
  var length = char.length;
  if (length == 0) {
      return [];
  }
  var startIndex = 0, index, indices = [];
  while ((index = text.indexOf(char, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + length;
  }
  return indices;
}
