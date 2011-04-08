var PLUGIN_INFO =
<KeySnailPlugin>
    <name>Select Sentence</name>
    <name lang="ja">文を選択</name>
    <description>Select a whole sentence around your selection (or caret)</description>
    <description lang="ja">セレクション(あるいはキャレット)周囲の文を選択します</description>
    <version>1.3</version>
    <updateURL>http://github.com/daregada/KeySnail_Plugin/raw/master/select_sentence.ks.js</updateURL>
    <author mail="daichi14657@gmail.com" homepage="http://daregada.blogspot.com/">Daregada</author>
    <license>The MIT License</license>
    <license lang="ja">MIT ライセンス</license>
    <minVersion>0.9.6</minVersion>
    <provides>
        <ext>select_sentence</ext>
    </provides>
    <detail><![CDATA[
=== Usage ===
==== Setting ====
You can paste code below to your .keysnail.js file.
>|javascript|
key.setGlobalKey('C-1',
    function (ev, arg) {
        ext.exec("select_sentence", arg);
    }, ext.description("select_sentence"), true);
||<
In this example, you can start select_sentence by pressing C-1 key in any mode.
==== Action ====
Click (or drag) any text-node and call select_sentence, and you can select automatically the whole sentence around caret (or selection).  You do NOT have to enter caret-mode (F7 key).
This select_sentence searches head and tail of the sentence from the clicked text-node and its sibling nodes.
==== Target languages ====
- English et al.
- Japanese
]]></detail>
    <detail lang="ja"><![CDATA[
=== 使い方 ===
==== 起動 ====
次のようにして適当なキーに select_sentence を割り当ててください。
>|javascript|
key.setGlobalKey('C-1',
    function (ev, arg) {
        ext.exec("select_sentence", arg);
    }, ext.description("select_sentence"), true);
||<
たとえば、上記のような設定を初期化ファイル(.keysnail.jsなど)に記述しておけば C-1 で起動します。
==== アクション ====
対象となるテキストの適当な位置をクリックしてから呼び出すと、その文の先頭と末尾を検索して文全体を選択します。F7キーでキャレットモードに切り替える必要はありません。

検索対象は、クリックしたテキストノードおよびその兄弟ノードです。繰り返し呼び出すと、検索対象に含まれる次の文も選択に追加されます。

なお、論理的な意味での文が、ヘッダーやフッターなどによって複数のパーツに分割されている場合は、ドラッグ(2箇所目以降はCtrl-ドラッグ)で、各パーツの一部を選択してから呼び出す必要があります。
==== 選択できる言語の種類と文末判定 ====
- 英語 (および「.」または「!」とそれに続く空白類で文末を示す他の言語)
- 日本語 (および「。」または「．」で文末を示す他の言語)
]]></detail>
</KeySnailPlugin>;

function select_sentence() {
//    var sentenceEndPattern = new RegExp(L('[.!]\\s+|(\\r\\n|\\n|\\r|\u2028){2,}|[\u3002\uff0e\u2029]'), 'g');
    var sentenceEndPattern = /[.!]\s+|(\r\n|\n|\r){2,}|[\u3002\uff0e\u2028\u2029]/g;
    var headNode, headIndex, tailNode, tailIndex;
    var baseTextNode, baseTextNodeValue, brCount;

    function searchHeadOfSentence(node, opt_offset) {
        function searchHeadByBrElements() {
            // view one BR as one newline
            brCount += 1;
            var str = new Array(brCount + 1).join('\n');
            str += baseTextNodeValue;

            var tmpIndex = str.search(sentenceEndPattern);

            if (tmpIndex >= 0 && tmpIndex < brCount) {
                headNode = baseTextNode;
                headIndex = 0;
            }
            return;
        }

        function searchHeadInTextNode() {
            var str = node.nodeValue.substr(0, opt_offset);
            if (brCount > 0) {
                str += new Array(brCount + 1).join('\n');
            }
            if (baseTextNode !== null) {
                str += baseTextNodeValue;
            }

            var tmpIndex = -1;
            var tmpArray = sentenceEndPattern.exec(str);
            while (tmpArray) {
                tmpIndex = sentenceEndPattern.lastIndex;
                tmpArray = sentenceEndPattern.exec(str);
            }

            if (tmpIndex > 0) {
                if (tmpIndex <= node.nodeValue.length) {
                    headNode = node;
                    headIndex = tmpIndex;
                } else {
                    headNode = baseTextNode;
                    headIndex = 0;
                }
            }
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            if (typeof opt_offset === 'undefined') {
                opt_offset =  node.nodeValue.length;
            }
            searchHeadInTextNode();
            if (headNode === null) {
                baseTextNode = node;
                baseTextNodeValue = node.nodeValue.substr(0, opt_offset);
                brCount = 0;
            }
        } else if (node.nodeName === 'BR') {
            searchHeadByBrElements();
        } else if (node.hasChildNodes()) {
            for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
                searchHeadOfSentence(node.childNodes[i]);
                if (headNode !== null) {
                    break;
                }
            }
        }
        return;
    }

    function searchTailOfSentence(node, opt_offset) {
        function searchTailByBrElements() {
            // view one BR as one newline
            brCount += 1;
            var str = baseTextNodeValue;
            str += new Array(brCount + 1).join('\n');

            var tmpIndex = str.search(sentenceEndPattern);

            if (tmpIndex >= 0) {
                tailNode = baseTextNode;
                tailIndex = baseTextNode.nodeValue.length;
            }
            return;
        }

        function searchTailInTextNode() {
            var str = node.nodeValue.substr(opt_offset);
            var preNodeLength = 0;
            if (brCount > 0) {
                str = new Array(brCount + 1).join('\n') + str;
                preNodeLength += brCount;
            }
            if (baseTextNode !== null) {
                str = baseTextNodeValue + str;
                preNodeLength += baseTextNodeValue.length;
            }

            var tmpIndex = str.search(sentenceEndPattern);
            if (tmpIndex >= 0) {
                if (tmpIndex >= preNodeLength) {
                    tailNode = node;
                    tailIndex = tmpIndex + opt_offset - preNodeLength;
                } else {
                    tailNode = baseTextNode;
                    tailIndex = baseTextNode.nodeValue.length;
                }
                if (tailIndex < tailNode.nodeValue.length &&
                    tailNode.nodeValue.charAt(tailIndex).search(/\s/) < 0) {
                    tailIndex += 1;
                }
           }
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            if (typeof opt_offset === 'undefined') {
                opt_offset =  0;
            }
            searchTailInTextNode();
            if (tailNode === null) {
                baseTextNode = node;
                baseTextNodeValue = baseTextNode.nodeValue.substr(opt_offset);
                brCount = 0;
            }
        } else if (node.nodeName === 'BR') {
            searchTailByBrElements();
        } else if (node.hasChildNodes()) {
            for (var i = 0; i < node.childNodes.length; i += 1) {
                searchTailOfSentence(node.childNodes[i]);
                if (tailNode !== null) {
                    break;
                }
            }
        }
        return;
    }

    function stretchRange(range, isFirstRange) {
        var str, tmpIndex;

        if (range.startContainer.nodeType !== Node.TEXT_NODE ||
            range.endContainer.nodeType !== Node.TEXT_NODE) {
            alert('Selection (or caret) is not in any text node');
            return;
        }

        headNode = tailNode = null;
        headIndex = tailIndex = -1;

        baseTextNode = null;
        baseTextNodeValue = "";
        brCount = 0;
        var currentNode = range.startContainer;

        searchHeadOfSentence(currentNode, range.startOffset);
        while (headNode === null && currentNode.previousSibling !== null) {
            currentNode = currentNode.previousSibling;
            searchHeadOfSentence(currentNode);
        }
        if (headNode === null) {
            headNode = currentNode;
            headIndex = 0;
        }

        baseTextNode = null;
        baseTextNodeValue = "";
        brCount = 0;
        currentNode = range.endContainer;

        searchTailOfSentence(currentNode, range.endOffset);
        while (tailNode === null && currentNode.nextSibling !== null) {
            currentNode = currentNode.nextSibling;
            searchTailOfSentence(currentNode);
        }
        if (tailNode === null) {
            tailNode = currentNode;
            tailIndex = (tailNode.nodeValue) ? tailNode.nodeValue.length : 0;
        }

        if (headNode === null || tailNode === null) {
            alert('headNode or tailNode is null');
            return;
        }

        if (headNode.nodeType === Node.TEXT_NODE) {
            str = headNode.nodeValue.substr(headIndex);
            tmpIndex = str.search(/\S/);
            if (tmpIndex > 0) {
                headIndex += tmpIndex;
            }
            if (!isFirstRange && headIndex > 0 &&
                headNode.nodeValue.substr(headIndex - 1, 1).search(/\s/) >= 0) {
                headIndex -= 1;
            }
        }
        if (tailNode.nodeType === Node.TEXT_NODE) {
            str = tailNode.nodeValue.substr(0, tailIndex);
            tmpIndex = str.search(/\s$/);
            if (tmpIndex > 0) {
                tailIndex = tmpIndex;
            }
        }

        range.setStart(headNode, headIndex);
        range.setEnd(tailNode, tailIndex);
        return;
    }


    var wrapper = new XPCNativeWrapper(window.content.window);
    for (var i = 0; i < wrapper.getSelection().rangeCount; i += 1) {
        var range = wrapper.getSelection().getRangeAt(i);
        wrapper.getSelection().removeRange(range);
        stretchRange(range, !i);
        wrapper.getSelection().addRange(range);
    }

    return;
}

ext.add("select_sentence", select_sentence,
        M({ja: 'セレクション(あるいはキャレット)周囲の文を選択',
           en: 'Select a whole sentence around selection (or caret)'}));
