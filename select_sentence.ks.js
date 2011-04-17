var PLUGIN_INFO =
<KeySnailPlugin>
    <name>Select Sentence</name>
    <name lang="ja">文を選択</name>
    <description>Select a whole sentence around your selection (or caret)</description>
    <description lang="ja">セレクション(あるいはキャレット)周囲の文を選択します</description>
    <version>1.6</version>
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
This select_sentence searches head and tail of the sentence from the clicked text-node and its sibling nodes.
Click (or drag) any text-node and call select_sentence, and you can select automatically the whole sentence around caret (or selection).  You do NOT have to enter caret-mode (F7 key).
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
- 英語 (および、「.」「!」「?」とそれに続く空白類で文末を示す他の言語)
- 日本語 (および「。」または「．」で文末を示す他の言語)
]]></detail>
</KeySnailPlugin>;

(
function () {
    var sentenceEndPattern = /[.!?](?:\[.*?\]|[")])*\s|(\r\n|\n|\r)\1+|[\u3002\uff0e\u2028\u2029]/g;

    var searcher_maker = function () {
        var that;
        var _container = null;
        var _offset = -1;
        var _info = [];
        var _string = "";

        return {
            init: function() {
                _container = null;
                _offset = -1;
                _info.length = 0;
                _string = "";
            },
            get isFound() {
                return (_container !== null);
            },
            get container() {
                return _container;
            },
            set container(value) {
                _container = value;
                return _container;
            },
            get offset() {
                return _offset;
            },
            set offset(value) {
                _offset = value;
                return _offset;
            },
            get info() {
                return _info;
            },
            get string() {
                return _string;
            },
            pushNode: function(node, value) {
                _info.push({ node: node, offset: _string.length });
                _string += value;
                return _string;
            },
            unshiftNode: function(node, value) {
                for (let i = 0; i < _info.length; i += 1) {
                    _info[i].offset += value.length;
                }
                _info.unshift({ node: node, offset: 0 });
                _string = value + _string;
                return _string;
            },
            getInfoIndexByNode: function(value) {
                if (value !== null) {
                    for (let i = 0; i < _info.length; i += 1) {
                        if (value === _info[i].node) {
                            return i;
                        }
                    }
                }
                return -1;
            },
            getInfoIndexByStringIndex: function(value) {
                if (value >= 0) {
                    for (let i = _info.length - 1; i >= 0; i -= 1) {
                        if (value >= _info[i].offset) {
                            return i;
                        }
                    }
                }
                return -1;
            },
            searchFirstTextNode: function() {
                // find first TEXT_NODE
                for (let i = 0; i < _info.length; i += 1) {
                    if (_info[i].node.nodeType === Node.TEXT_NODE) {
                        _container = _info[i].node;
                        // set index before the first char;
                        _offset = 0;
                        break;
                    }
                }
                return _container;
            },
            searchLastTextNode: function() {
                // find last TEXT_NODE
                for (let i = _info.length - 1; i >= 0; i -= 1) {
                    if (_info[i].node.nodeType === Node.TEXT_NODE) {
                        _container = _info[i].node;
                        // set index after the last char
                        _offset = _container.nodeValue.length;
                        break;
                    }
                }
                return _container;
            }
        };
    };
    var head = searcher_maker();
    var tail = searcher_maker();

    head.search = function (range) {
        function searchByNode(targetNode) {
            if (targetNode.nodeType === Node.TEXT_NODE) {
                let str = targetNode.nodeValue;
                if (targetNode === range.startContainer) {
                    str = str.substr(0, range.startOffset);
                }
                that.unshiftNode(targetNode, str);
                that.searchPattern(range);
            } else if (targetNode.nodeName === 'BR') {
                // view one BR as one newline
                that.unshiftNode(targetNode, '\n');
                that.searchPattern(range);
            } else if (targetNode.hasChildNodes()) {
                for (let i = targetNode.childNodes.length - 1; i >= 0; i -= 1) {
                    searchByNode(targetNode.childNodes[i]);
                    if (that.isFound) {
                        break;
                    }
                }
            }
            return;
        }

        var that = this;
        var currentNode = range.startContainer;
        searchByNode(currentNode);
        while (!this.isFound && currentNode.previousSibling !== null) {
            currentNode = currentNode.previousSibling;
            searchByNode(currentNode);
        }
        if (!this.isFound) {
            this.searchFirstTextNode();
            if (!this.isFound) {
                this.container = currentNode;
                // set index before the first char OR the first child node
                this.offset = 0;
            }
        }
        return;
    };

    tail.search = function(range) {
        function searchByNode(targetNode) {
            if (targetNode.nodeType === Node.TEXT_NODE) {
                let str = targetNode.nodeValue;
                if (targetNode === range.endContainer) {
                    str = str.substr(range.endOffset);
                }
                that.pushNode(targetNode, str);
                that.searchPattern(range);
            } else if (targetNode.nodeName === 'BR') {
                // view one BR as one newline
                that.pushNode(targetNode, '\n');
                that.searchPattern(range);
            } else if (targetNode.hasChildNodes()) {
                for (let i = 0; i < targetNode.childNodes.length; i += 1) {
                    searchByNode(targetNode.childNodes[i]);
                    if (that.isFound) {
                        break;
                    }
                }
            }
            return;
        }

        var that = this;
        var currentNode = range.endContainer;
        searchByNode(currentNode);
        while (!this.isFound && currentNode.nextSibling !== null) {
            currentNode = currentNode.nextSibling;
            searchByNode(currentNode);
        }
        if (!this.isFound) {
            this.searchLastTextNode();
            if (!this.isFound) {
                this.container = currentNode;
                // set index after the last char OR the last child node
                this.offset = (currentNode.nodeValue) ?
                    currentNode.nodeValue.length : currentNode.childNodes.length;
            }
        }
        return;
    };

    head.searchPattern = function(range) {
        var stringIndex = -1;
        // init lastIndex fot test()
        sentenceEndPattern.lastIndex = 0;
        while (sentenceEndPattern.test(this.string)) {
            stringIndex = sentenceEndPattern.lastIndex;
        }
        var infoIndex = this.getInfoIndexByStringIndex(stringIndex);
        if (infoIndex >= 0) {
            this.container = this.info[infoIndex].node;
            if (this.container.nodeType === Node.TEXT_NODE) {
                // set offset as char index in the container
                this.offset = stringIndex - this.info[infoIndex].offset;
            } else {
                // set offset as node index in the container
                this.offset = 0;
            }
        }
        return;
    };

    tail.searchPattern = function(range) {
        var stringIndex = -1;
        // init lastIndex fot test()
        sentenceEndPattern.lastIndex = 0;
        if (sentenceEndPattern.test(this.string)) {
            stringIndex = sentenceEndPattern.lastIndex;
        }
        var infoIndex = this.getInfoIndexByStringIndex(stringIndex);
        if (infoIndex >= 0) {
            this.container = this.info[infoIndex].node;
            if (this.container.nodeType === Node.TEXT_NODE) {
                // set offset as char index in the container
                this.offset = stringIndex - this.info[infoIndex].offset;
                // special case
                if (this.container === range.endContainer) {
                    this.offset += range.endOffset;
                }
            } else if (this.container.hasChildNodes()) {
                // set offset as node index in the container
                this.offset = this.container.childNodes.length;
            } else {
                this.offset = 0;
            }
        }
        return;
    };

    head.chop = function () {
        var str, tmpIndex;
        if (this.container.nodeType !== Node.TEXT_NODE) {
            return;
        }
        // find head.container in head.info
        var arrayIndex = this.getInfoIndexByNode(this.container);
        str = this.string.substr(this.info[arrayIndex].offset + this.offset);
        tmpIndex = str.search(/\S/);

        if (tmpIndex > 0) {
            let indexInHeadString = this.info[arrayIndex].offset + this.offset + tmpIndex;
            let foundNodeIndex = this.info.length - 1;
            for (let i = 0; i < this.info.length - 1; i += 1) {
                if (indexInHeadString < this.info[i + 1].offset) {
                    foundNodeIndex = i;
                    break;
                }
            }
            this.container = this.info[foundNodeIndex].node;
            this.offset = (this.container.nodeType === Node.TEXT_NODE) ?
                indexInHeadString - this.info[foundNodeIndex].offset: 0;
        }
        return;
    };

    tail.chop = function (range, isLastRange) {
        var str, tmpIndex;
        if (this.container.nodeType !== Node.TEXT_NODE) {
            return;
        }
        // find tail.container in tail.info
        var arrayIndex = this.getInfoIndexByNode(this.container);
        str = (arrayIndex > 0) ?
            this.string.substr(0, this.info[arrayIndex].offset + this.offset) :
            this.string.substr(0, this.offset - range.endOffset);
        tmpIndex = str.search(/\s+$/);

        if (tmpIndex >= 0) {
            if (!isLastRange) {
                tmpIndex += 1;
            }
            for (let i = this.info.length - 1; i > 0; i -= 1) {
                if (tmpIndex >= this.info[i].offset) {
                    this.container = this.info[i].node;
                    this.offset = (this.container.nodeType === Node.TEXT_NODE) ?
                        tmpIndex - this.info[i].offset : this.container.childNodes.length;
                    return;
                }
            }
            this.container = this.info[0].node;
            this.offset = (this.container.nodeType === Node.TEXT_NODE) ?
                tmpIndex + range.endOffset : this.container.childNodes.length;
        }
        return;
    };

    function stretchRange(range, isLastRange) {
        head.init();
        tail.init();

        head.search(range);
        tail.search(range);

        if (!head.isFound || !tail.isFound) {
            alert('head-node or tail-node is null');
            return;
        }

        head.chop();
        tail.chop(range, isLastRange);

        range.setStart(head.container, head.offset);
        range.setEnd(tail.container, tail.offset);
        return;
    }

     function select_sentence() {
         var range, isLastRange;
         var wrapper = new XPCNativeWrapper(window.content.window);
         for (let i = 0; i < wrapper.getSelection().rangeCount; i += 1) {
             range = wrapper.getSelection().getRangeAt(i);
             isLastRange = (i == wrapper.getSelection().rangeCount - 1);
             wrapper.getSelection().removeRange(range);
             stretchRange(range, isLastRange);
             wrapper.getSelection().addRange(range);
         }
         return;
     }

     ext.add("select_sentence", select_sentence,
             M({ja: 'セレクション(あるいはキャレット)周囲の文を選択',
                en: 'Select a whole sentence around selection (or caret)'}));
})();
