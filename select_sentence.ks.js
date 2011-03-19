var PLUGIN_INFO =
<KeySnailPlugin>
    <name>Selection Sentence</name>
    <name lang="ja">文を選択</name>
    <description>Select a sentence around selection (or caret)</description>
    <description lang="ja">セレクション(あるいはキャレット)周囲の文を選択します</description>
    <version>1.00</version>
    <updateURL>http://github.com/daregada/KeySnail_Plugin/raw/master/select_sentence.ks.js</updateURL>
    <author mail="daichi14657@gmail.com" homepage="http://daregada.blogspot.com/">Daregada</author>
    <license>The MIT License</license>
    <license lang="ja">MIT ライセンス</license>
    <minVersion>0.9.6</minVersion>
    <provides>
        <ext>select_sentence</ext>
    </provides>
    <detail lang="ja"><![CDATA[
=== 使い方 ===
==== 起動 ====
M-x (または ext.select() を呼出すキーバインド) から select_sentence を選ぶと起動します。
次のようにして任意のキーへコマンドを割り当てておくことも可能です。
>||
key.setViewKey('C-1',
    function (ev, arg) {
        ext.exec("select_sentence", arg);
    }, ext.description("select_sentence"), true);
||<
例えば上記のような設定を初期化ファイル(.keysnail.jsなど)へ記述しておくことにより、ブラウズ画面で C-1 と押すことで起動します。

==== アクションの選択 ====
対象となるテキストの適当な位置をクリックしてから呼び出すと、その文の先頭と末尾を検索して文全体を選択します。いちいちF7キーを押してキャレットモードにする必要はありません。
検索対象は、クリックしたテキストノードおよびその兄弟ノードです。繰り返し呼び出すと、検索対象に含まれる次の文も選択に追加されます。

==== 選択できる言語の種類と文末判定 ====
- 英語 (および「.」と空白類で文末を示す他の言語)
- 日本語 (および「。」または「．」で文末を示す他の言語)

]]></detail>
</KeySnailPlugin>;

function select_sentence() {
    var sentenceEndPattern = new RegExp(L('\\.\\s+|\\n{2,}|[。．]'), 'g');
    var tailNode = null;
    var tailIndex = -1;
    var headNode = null;
    var headIndex = -1;

    function searchSentenceHead(node, opt_offset) {
	if (node.nodeType !== Node.TEXT_NODE) {
	    if (!node.hasChildNodes()) {
		return;
	    }
	    for (var i = node.childNodes.length - 1; i >= 0; i--) {
		searchSentenceHead(node.childNodes[i]);
		if (headNode !== null) {
		    break;
		}
	    }
	    return;
	}

	var str = node.nodeValue;
	if (typeof opt_offset !== "undefined") {
	    str = str.substr(0, opt_offset);
	}
	headIndex = 0;
	var tmpArray = sentenceEndPattern.exec(str);
	while (tmpArray) {
	    headIndex = sentenceEndPattern.lastIndex;
	    tmpArray = sentenceEndPattern.exec(str);
	}
	if (headIndex > 0) {
	    headNode = node;
	}
	return;
    }

    function searchSentenceTail(node, opt_offset) {
	if (node.nodeType !== Node.TEXT_NODE) {
	    if (!node.hasChildNodes()) {
		return;
	    }
	    for (var i = 0; i < node.childNodes.length; i++) {
		searchSentenceTail(node.childNodes[i]);
		if (tailNode !== null) {
		    break;
		}
	    }
	    return;
	}

	var str = node.nodeValue;
	opt_offset = opt_offset ? opt_offset : 0;
	if (opt_offset > 0) {
	    str = str.substr(opt_offset);
	}
	tailIndex = str.search(sentenceEndPattern);
	if (tailIndex >= 0) {
	    tailNode = node;
	    tailIndex += opt_offset;
	    var nextChar = tailNode.nodeValue.charAt(tailIndex);
	    if (nextChar === '.' || nextChar === L('。') || nextChar === L('．')) {
		tailIndex++;
	    }
	}
	return;
    }

    var range = content.getSelection().getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE ||
	range.endContainer.nodeType !== Node.TEXT_NODE) {
	// 開始位置または終了位置がテキストノードでない場合は終了
	alert('Selection (or caret) is not in any text node');
	return;
    }

    // startContainerノードのオフセットstartOffsetから文書先頭方向に前の文の末尾を探す
    var currentNode = range.startContainer;
    // startContainerノードだけは特別扱い(startOffsetより後を検索しないように)
    searchSentenceHead(currentNode, range.startOffset);

    // startContainerより文書先頭方向の兄弟ノードをめぐる
    while (headNode === null && currentNode.previousSibling !== null) {
	currentNode = currentNode.previousSibling;
	searchSentenceHead(currentNode);
    }
    if (headNode === null) {
	// 先頭の兄弟ノードまで到達しても前の文の文末が見つからなかったら
	headNode = currentNode;
	headIndex = 0;
    }

    // endContainerノードのオフセットendOffsetから文書末尾方向に文末を探す
    currentNode = range.endContainer;
    // endContainerノードだけは特別扱い(endOffsetより前を検索しないように)
    searchSentenceTail(currentNode, range.endOffset);

    // endContainerより文書末尾方向の兄弟ノードをめぐる
    while (tailNode === null && currentNode.nextSibling !== null) {
	currentNode = currentNode.nextSibling;
	searchSentenceTail(currentNode);
    }
    if (tailNode === null) {
	// 末尾の兄弟ノードまで到達しても文末が見つからなかったら
	tailNode = currentNode;
	tailIndex = (tailNode.nodeValue) ? tailNode.nodeValue.length : 0;
    }

    if (headNode === null || tailNode === null) {
	alert('headNode or tailNode is null');
	return;
    }

    // 先頭と末尾のホワイトスペースを取り除く
    if (headNode.nodeType === Node.TEXT_NODE) {
	var str = headNode.nodeValue.substr(headIndex);
	var tmpIndex = str.search(/\S/);
	if (tmpIndex > 0) {
	    headIndex += tmpIndex;
	}
    }
    if (tailNode.nodeType === Node.TEXT_NODE) {
	var str = tailNode.nodeValue.substr(0, tailIndex);
	var tmpIndex = str.search(/\s$/);
	if (tmpIndex > 0) {
	    tailIndex = tmpIndex;
	}
    }

    // 最終的に得られた範囲を選択する
    content.getSelection().removeAllRanges();
    range.setStart(headNode, headIndex);
    range.setEnd(tailNode, tailIndex);
    content.getSelection().addRange(range);

    return;
}

ext.add("select_sentence", select_sentence,
        M({ja: 'セレクション(あるいはキャレット)周囲の文を選択',
           en: 'Select a sentence around selection (or caret)'}));
