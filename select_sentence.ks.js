var PLUGIN_INFO =
<KeySnailPlugin>
    <name>Select Sentence</name>
    <name lang="ja">文を選択</name>
    <description>Select a whole sentence around your selection (or caret)</description>
    <description lang="ja">セレクション(あるいはキャレット)周囲の文を選択します</description>
    <version>1.4</version>
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

検索対象は、クリックしたテキストノードおよびその兄弟ノードです。検索対象に含まれていれば、繰り返し呼び出すことで次以降の文を順次選択に追加できます。

なお、論理的な意味での文が、テキストで書かれたヘッダーやフッターなどによって複数のパーツに分割されている場合は、ドラッグ(2箇所目以降はCtrl-ドラッグ)で、各パーツの一部を選択してから呼び出す必要があります。
==== 選択できる言語の種類と文末判定 ====
- 英語 (および「.」または「!」とそれに続く空白類で文末を示す他の言語)
- 日本語 (および「。」または「．」で文末を示す他の言語)
]]></detail>
</KeySnailPlugin>;

function select_sentence() {
    var sentenceEndPattern = /[.!?](?:\[.*?\]|[")])*\s|(\r\n|\n|\r)(?=\1+)|[\u3002\uff0e\u2028\u2029]/g;
    var head = {}, tail = {};
    var headString, tailString;
    var headArray = [], tailArray = [];
    var range, wrapper;

    function searchHeadNodeAndIndex(targetNode, isRangeStartContainer) {
        function searchHeadPattern() {
            var tmpIndex = -1;
            var tmpArray = sentenceEndPattern.exec(headString);
            while (tmpArray) {
                tmpIndex = sentenceEndPattern.lastIndex;
                tmpArray = sentenceEndPattern.exec(headString);
            }
            if (tmpIndex <= 0) {
                return;
            }
            for (let i = headArray.length - 1; i >= 0; i -= 1) {
                if (tmpIndex >= headArray[i].offset) {
                    head.node = headArray[i].node;
                    head.index = (head.node.nodeType === Node.TEXT_NODE) ?
                        tmpIndex - headArray[i].offset : 0;
                    return;
                }
            }
            return;
        }

        function searchHeadByBrElements() {
            // view one BR as one newline
            var str = '\n';
            for (let i = 0; i < headArray.length; i += 1) {
                headArray[i].offset += str.length;
            }
            headArray.unshift({ node: targetNode, offset: 0 });
            headString = str + headString;
            searchHeadPattern();
            return;
        }

        function searchHeadInTextNode() {
            var str = targetNode.nodeValue;
            if (isRangeStartContainer) {
                str = str.substr(0, range.startOffset);
            }
            for (let i = 0; i < headArray.length; i += 1) {
                headArray[i].offset += str.length;
            }
            headArray.unshift({ node: targetNode, offset: 0 });
            headString = str + headString;
            searchHeadPattern();
            return;
        }

        //==========================================
        if (targetNode.nodeType === Node.TEXT_NODE) {
            searchHeadInTextNode();
        } else if (targetNode.nodeName === 'BR') {
            searchHeadByBrElements();
        } else if (targetNode.hasChildNodes()) {
            for (let i = targetNode.childNodes.length - 1; i >= 0; i -= 1) {
                searchHeadNodeAndIndex(targetNode.childNodes[i], false);
                if (head.node !== null) {
                    break;
                }
            }
        }
        return;
    }

    function searchTailNodeAndIndex(targetNode, isRangeEndContainer) {
        function searchTailPattern() {
            var tmpIndex = -1;
            if (sentenceEndPattern.exec(tailString)) {
                tmpIndex = sentenceEndPattern.lastIndex;
            }
            if (tmpIndex <= 0) {
                return;
            }
            for (let i = tailArray.length - 1; i >= 0; i -= 1) {
                if (tmpIndex >= tailArray[i].offset) {
                    tail.node = tailArray[i].node;
                    tail.index = 0;
                    if (tail.node.nodeType === Node.TEXT_NODE) {
                        tail.index = tmpIndex - tailArray[i].offset;
                        if (tail.node === range.endContainer) {
                            tail.index += range.endOffset;
                        }
                    } else if (tail.node.hasChildNodes()) {
                        tail.index = tail.node.childNodes.length;
                    }
                    return;
                }
            }
            return;
        }

        function searchTailByBrElements() {
            // view one BR as one newline
            var str = '\n';
            tailArray.push({ node: targetNode, offset: tailString.length });
            tailString += str;
            searchTailPattern();
            return;
        }

        function searchTailInTextNode() {
            var str = targetNode.nodeValue;
            if (isRangeEndContainer) {
                str = str.substr(range.endOffset);
            }
            tailArray.push({ node: targetNode, offset: tailString.length });
            tailString += str;
            searchTailPattern();
            return;
        }

        //==========================================
        if (targetNode.nodeType === Node.TEXT_NODE) {
            searchTailInTextNode();
        } else if (targetNode.nodeName === 'BR') {
            searchTailByBrElements();
        } else if (targetNode.hasChildNodes()) {
            for (let i = 0; i < targetNode.childNodes.length; i += 1) {
                searchTailNodeAndIndex(targetNode.childNodes[i], false);
                if (tail.node !== null) {
                    break;
                }
            }
        }
        return;
    }

    function searchHeadOfSentence() {
        var  currentNode = range.startContainer;
        searchHeadNodeAndIndex(currentNode, true);
        while (head.node === null && currentNode.previousSibling !== null) {
            currentNode = currentNode.previousSibling;
            searchHeadNodeAndIndex(currentNode, false);
        }
        if (head.node === null) {
            head.node = currentNode;
            // find first TEXT_NODE
            for (let i = 0; i < headArray.length; i += 1) {
                if (headArray[i].node.nodeType === Node.TEXT_NODE) {
                    head.node = headArray[i].node;
                    break;
                }
            }
            // set index before the first char OR the first child node
            head.index = 0;
        }
        return;
    }

    function searchTailOfSentence() {
        var currentNode = range.endContainer;
        searchTailNodeAndIndex(currentNode, true);
        while (tail.node === null && currentNode.nextSibling !== null) {
            currentNode = currentNode.nextSibling;
            searchTailNodeAndIndex(currentNode, false);
        }
        if (tail.node === null) {
            tail.node = currentNode;
            // find last TEXT_NODE
            for (let i = tailArray.length - 1; i >= 0; i -= 1) {
                if (tailArray[i].node.nodeType === Node.TEXT_NODE) {
                    tail.node = tailArray[i].node;
                    break;
                }
            }
            // set index after the last char OR the last child node
            tail.index = (tail.node.nodeValue) ?
                tail.node.nodeValue.length : tail.node.childNodes.length;
        }
        return;
    }

    function chopHeadOfSentence() {
        var str, tmpIndex;
        if (head.node.nodeType !== Node.TEXT_NODE) {
            return;
        }
        // find head.node in headArray
        var arrayIndex = -1;
        for (let i = 0; i < headArray.length; i += 1) {
            if (head.node == headArray[i].node) {
                arrayIndex = i;
                break;
            }
        }
        str = headString.substr(headArray[arrayIndex].offset + head.index);
        tmpIndex = str.search(/\S/);

        if (tmpIndex > 0) {
            let indexInHeadString = headArray[arrayIndex].offset + head.index + tmpIndex;
            let foundIndex = headArray.length - 1;
            for (let i = 0; i < headArray.length - 1; i += 1) {
                if (indexInHeadString < headArray[i + 1].offset) {
                    foundIndex = i;
                    break;
                }
            }
            head.node = headArray[foundIndex].node;
            head.index = (head.node.nodeType === Node.TEXT_NODE) ?
                indexInHeadString - headArray[foundIndex].offset: 0;
        }
        return;
    }

    function chopTailOfSentence(isLastRange) {
        var str, tmpIndex;
        if (tail.node.nodeType !== Node.TEXT_NODE) {
            return;
        }
        // find tail.node in tailArray
        var arrayIndex = -1;
        for (let i = 0; i < tailArray.length; i += 1) {
            if (tail.node == tailArray[i].node) {
                arrayIndex = i;
                break;
            }
        }

        str = (arrayIndex > 0) ?
            tailString.substr(0, tailArray[arrayIndex].offset + tail.index) :
            tailString.substr(0, tail.index - range.endOffset);
        tmpIndex = str.search(/\s+$/);

        if (tmpIndex >= 0) {
            if (!isLastRange) {
                tmpIndex += 1;
            }
            for (let i = tailArray.length - 1; i > 0; i -= 1) {
                if (tmpIndex >= tailArray[i].offset) {
                    tail.node = tailArray[i].node;
                    tail.index = (tail.node.nodeType === Node.TEXT_NODE) ?
                        tmpIndex - tailArray[i].offset : tail.node.childNodes.length;
                    return;
                }
            }
            tail.node = tailArray[0].node;
            tail.index = (tail.node.nodeType === Node.TEXT_NODE) ?
                tmpIndex + range.endOffset : tail.node.childNodes.length;
        }
        return;
    }

    function stretchRange(range, isLastRange) {
        // consider later...
        if (range.startContainer.nodeType !== Node.TEXT_NODE ||
            range.endContainer.nodeType !== Node.TEXT_NODE) {
            alert('Selection (or caret) is not in any text node');
            return;
        }

        head.node = tail.node = null;
        head.index = tail.index = -1;
        headString = tailString = "";

        searchHeadOfSentence();
        searchTailOfSentence();

        if (head.node === null || tail.node === null) {
            alert('head-node or tail-node is null');
            return;
        }

        chopHeadOfSentence();
        chopTailOfSentence(isLastRange);

        range.setStart(head.node, head.index);
        range.setEnd(tail.node, tail.index);
        return;
    }

    //==========================================
    wrapper = new XPCNativeWrapper(window.content.window);
    var count;
    for (let i = 0; i < wrapper.getSelection().rangeCount; i += 1) {
        range = wrapper.getSelection().getRangeAt(i);
        count = wrapper.getSelection().rangeCount;
        wrapper.getSelection().removeRange(range);
        stretchRange(range, (i == count - 1));
        wrapper.getSelection().addRange(range);
    }

    return;
}

ext.add("select_sentence", select_sentence,
        M({ja: 'セレクション(あるいはキャレット)周囲の文を選択',
           en: 'Select a whole sentence around selection (or caret)'}));
