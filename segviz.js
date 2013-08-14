var track;
var cmin = [];
var cmax = [];

var plusPath =
    'M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466zM13.665,25.725l-3.536-3.539l6.187-6.187l-6.187-6.187l3.536-3.536l9.724,9.723L13.665,25.725z';

var minusPath =
    'M16,30.534c8.027,0,14.534-6.507,14.534-14.534c0-8.027-6.507-14.534-14.534-14.534C7.973,1.466,1.466,7.973,1.466,16C1.466,24.027,7.973,30.534,16,30.534zM18.335,6.276l3.536,3.538l-6.187,6.187l6.187,6.187l-3.536,3.537l-9.723-9.724L18.335,6.276z';

var playPath = "M6.684,25.682L24.316,15.5L6.684,5.318V25.682z";

var stopPath = "M5.5,5.5h20v20h-20z";
var playButtonPath;
var isPlaying = false;


function normalizeColor() {
    cmin = [100,100,100];
    cmax = [-100,-100,-100];

    var qlist = track.analysis.segments;
    for (var i = 0; i < qlist.length; i++) {
        for (var j = 0; j < 3; j++) {
            var t = qlist[i].timbre[j + 1];

            if (t < cmin[j]) {
                cmin[j] = t;
            }
            if (t > cmax[j]) {
                cmax[j] = t;
            }
        }
    }
}

function getColor(seg) {
    var results = []
    for (var i = 0; i < 3; i++) {
        var t = seg.timbre[i + 1];
        var norm = (t - cmin[i]) / (cmax[i] - cmin[i]);
        results[i] = norm * 255;
    }
    return to_rgb(results[0], results[1], results[2]);
}

function getSegmentColor(seg) {
    return getColor(seg);
}


function getQuantumColor(q) {
    if (isSegment(q)) {
        return getSegmentColor(q);
    } else {
        q = getQuantumSegment(q);
        if (q != null) {
            return getSegmentColor(q);
        } else {
            return "#000";
        }
    }
}

function getQuantumSegment(q) {
    return q.oseg;
}


function isSegment(q) {
    return 'timbre' in q;
}


function renderViz(div, type, which, playCallback, vizCallback, stateCallback) {
    var minWidth = 820;
    var margin = 20;
    var curQ = track.analysis[type][which];
    var emptyVec = [0,0,0,0,0,0,0,0,0,0,0,0];
    var sx = 62;
    var sy = 62;

    var idLabel;
    var distanceLabel;

    var widgets = {};

    function playNow(q) {
        player.playNow(q);
        if (playCallback) {
            playCallback(q);
        }
    }

    function createSongSelector(paper, x, y, width, height, type, cur) {
        var quanta = track.analysis[type];
        var maxVisQ = 150;
        var inc = Math.ceil(quanta.length / maxVisQ);
        var aw = width /  maxVisQ;
        var lw = Math.round(aw);
        var radius = 4;
        var cursorColor = '#8b7765'
        var cursorColor = '#8bb765'
        var cursor1;
        var cursor2;

        var widget =  {

            update: function(q) {
                var xPos = q.which / inc * aw + radius / 2;
                cursor1.attr( { cx: x + xPos})  ;
                cursor2.attr( { cx: x + xPos})  ;
            },

            layout: function() {
                var curX = x;
                for (var i = 0; i < quanta.length; i += inc) {
                    var q = quanta[i];
                    createSimpleTile(q, curX, y, lw, height);
                    curX += aw;
                }

                cursor1 = paper.circle(x, y - radius, radius);
                cursor2 = paper.circle(x, y + height + radius, radius);
                cursor1.attr('fill', cursorColor);
                cursor1.attr('stroke', cursorColor);
                cursor2.attr('fill', cursorColor);
                cursor2.attr('stroke', cursorColor);
            },
        };

        widget.layout();
        return widget;
    }

    function createSimpleTile(q, x, y, w, h) {
        var rect = paper.rect(x, y, w, h);
        var color = getQuantumColor(q);
        rect.attr('fill', color);
        rect.attr('stroke', color);
        rect.mouseover(function() { rect.attr('fill', '#efe'); if (!isPlaying) updateViz(q); });
        rect.mouseout(function(evt) { rect.attr('fill', color); evt.preventDefault();});
        rect.mouseup(function() { playNow(q); updateViz(q); } );
    }

    function createTile(x, y, width, fullHeight, prefix, updateFunc) {
        var textMarginY = 20;
        var height = fullHeight - textMarginY;
        var rect;

        var tile = {
            q : null,

            update: function(q) {
                this.q = q;
                tile.normalColor = getQuantumColor(q);
                var qWidth = interp(this.q.duration, 0, 1) * width;
                this.rect.animate( { width: qWidth } , animateTime(q), '<>');
                if (this.dLabel) {
                    this.dLabel.attr( { text: prefix + q.which } );
                }
                this.normal();
            },

            layout: function() {
                var that = this;

                this.rect = paper.rect(x, y, width, height );
                this.dLabel = paper.text(x + 10, y + height + textMarginY / 2 , '100');

                this.rect.mouseover(
                    function() { 
                        that.highlight();
                        updateFunc(that.q);
                    }
                );

                this.rect.mousedown(
                    function(evt) { 
                        that.play(); 
                        evt.preventDefault()
                    }
                );

                this.rect.mouseout(
                    function() { 
                        that.normal();
                    } 
                );
            },

            play:function() {
                var that = this;
                this.playStyle();
                playNow(this.q);
                setTimeout(function() { that.normal(); }, this.q.duration * 1000 / 2);
            },

            normal: function() {
                this.rect.attr("fill", this.normalColor);
                this.rect.attr("fill", this.normalColor);
            },

            highlight: function() {
                this.rect.attr("fill", "#9FF");
            },

            playStyle: function() {
                this.rect.attr("fill", "#FF9");
            },
        };

        tile.layout();
        return tile;
    }


    function addButton(x, y, icon, callback) {
        var path = paper.path(icon).attr({fill: "#666", stroke: "none"});
        var rect = paper.rect(x, y, 28, 28);
        rect.attr("stroke", "none");
        rect.attr("fill", "#ddd");
        //rect.attr("fill", "#22d");
        path.transform("t" + x + ',' + y + 's'+.6 + ',' + .6);
        path.toFront();

        var mouseover = function() { path.attr('fill', '#4a4'); }
        var mouseout = function() { path.attr('fill', '#666'); }
        var mousedown = function() { path.attr('fill', '#aaa'); }
        var mouseup = function() { path.attr('fill', '#484'); callback(path)}

        path.mouseover(mouseover);
        rect.mouseover(mouseover);

        path.mouseout(mouseout);
        rect.mouseout(mouseout);

        path.mousedown(mousedown);
        rect.mousedown(mousedown);

        path.mouseup(mouseup);
        rect.mouseup(mouseup);
        return path;
    }


    function addPlus(x, y) {
        addButton(x, y, plusPath, function() {
            if (curQ.next) {
                playNow(curQ.next);
                updateViz(curQ.next);
            }
        });
    }

    function addMinus(x, y) {
        addButton(x, y, minusPath, function() {
            if (curQ.prev) {
                playNow(curQ.prev);
                updateViz(curQ.prev);
            }
        });
    }

    function addPlay(x, y) {
        playButtonPath = addButton(x, y, playPath, function(path) {
            if (isPlaying) {
                stopPlaying();
            } else {
                startPlaying();
            }
        });
    }

    function clamp(val, min, max) {
        return val > max ? max : val < min ? min : val;
    }

    function interp(val, min, max) {
        val = clamp(val, min, max);
        return (val - min) / (max - min);
    }

    function createLoudnessPlot(x,y, width, fullHeight) {
        var textMarginX = 10;
        var textMarginY = 20;
        var height = fullHeight - textMarginY;
        var curve;


        var loudness = {
            layout: function() {
                var label = paper.text(x, y + height + textMarginY / 2, 'Loudness');
                label.attr('text-anchor', 'start');
                // var rect = paper.rect(x, y, width, height );
            },


            update: function(q) {
                var coords = [];
                coords.push( [0, scale(q.loudness_start) ]);
                coords.push( [q.loudness_max_time / q.duration, scale(q.loudness_max) ]);
                coords.push( [1, scale(q.next ? q.next.loudness_start : -60) ]);

                var path = "";
                path = catPath(path, "M",x, y + height);
                for (var i = 0; i < coords.length; i++) {
                    var c = coords[i];
                    path = catPath(path, "L", c[0] * width + x, (y + height) - (c[1] * height));
                }

                path = catPath(path, "L", x + width, y + height);
                path += 'Z';
                if (this.curve) {
                    this.curve.animate({path : path}, animateTime(q), '<>');
                } else {
                    this.curve = paper.path(path);
                }

                this.curve.attr('fill', '#afa');
            }
        };


        function scale(l) {
            var sl = interp(l, -60, 0);
            return sl * sl;
        }

        loudness.layout();
        return loudness;
    }

    function animateTime(q) {
        return 100;
        // return q.duration * 1000 / 2;
    }

    function createConfidencePlot(x,y, width, fullHeight) {
        var textMarginX = 10;
        var textMarginY = 20;
        var height = fullHeight - textMarginY;
        var barWidth = 20;
        var color = '#339';
        var rect;
        var vlabel;


        var widget = {
            layout: function() {
                var label = paper.text(x, y + height + textMarginY / 2, 'Confidence');
                label.attr('text-anchor', 'start');
                var xs = x + width / 2 - barWidth / 2;
                rect = paper.rect(xs, y, barWidth, height );
                rect.attr('fill', color);
                vlabel = paper.text(xs + 8, y + height - 8, '0');
            },

            update: function(q) {
                rect.animate( 
                    {
                        y: y + (height - q.confidence * height), 
                        height: q.confidence * height
                    }, animateTime(q), '<>');

                vlabel.attr('text', Math.round(q.confidence * 100));
                vlabel.animate( 
                    {
                        y: (y + (height - q.confidence * height)) - textMarginY / 2, 
                    }, animateTime(q), '<>');



                
            }
        };

        widget.layout();
        return widget;
    }


    function createHistogram(title, type, x, y, width, fullHeight, minRange, maxRange, size) {
        var textMarginX = 10;
        var textMarginY = 20;
        var height = fullHeight - textMarginY;
        var label;
    
        var hist = {
            minRange: minRange,
            maxRange: maxRange,
            vec: emptyArray(size),
            bars: [],

            update: function(q) {
                if (type in q) {
                    this.vec = q[type];
                    Raphael.getColor.reset();
                    for (var i = 0; i < this.vec.length; i++) {
                        var ratio = interp(this.vec[i], minRange, maxRange);
                        this.bars[i].animate( 
                            {
                                y: y + (height - ratio * height), 
                                height: ratio * height
                            }, 
                            animateTime(q), '<>');
                    }
                    label.attr('text', title + ' for seg ' + q.which);
                }
            },

            layout: function() {
                label = paper.text(x + textMarginX, y + height + textMarginY / 2, title);
                label.attr('text-anchor', 'start');

                var xo = x;
                var barWidth = width / this.vec.length;
                var bars = [];

                Raphael.getColor.reset();
                for (var i = 0; i < this.vec.length; i++) {
                    var ratio = interp(this.vec[i], minRange, maxRange);
                    var bar = paper.rect(xo, y + (height - ratio * height), barWidth, ratio * height);
                    bar.attr("fill", Raphael.getColor());
                    bars.push(bar);
                    xo += barWidth;
                }

                this.bars = bars;
            }
        };

        hist.layout();
        return hist;
    }

    function prefix(type) {
        if (type == 'segments') {
            return 'seg ';
        } else {
            return 'beat ';
        }
    }


    function genQuantumPanel(ypos) {
        var stdH = 90;
        addPlus( 0, ypos + 0);
        addMinus( 0, ypos + 30);
        widgets['pitches'] = createHistogram('Pitch', 'pitches', sx, ypos, 120, stdH, 0, 1, 12);
        widgets['timbre'] = createHistogram('Timbre', 'timbre', sx + 140, ypos, 120, stdH, -75, 75, 12);
        widgets['loudness'] = createLoudnessPlot(sx + 280, ypos, 120, stdH);
        widgets['confidence'] = createConfidencePlot(sx + 420, ypos, 40, stdH);
        widgets['tile'] = createTile(sx + 500, ypos, 100, stdH, prefix(type), updateViz);
    }

    function genQuantumPanelOrg(ypos) {
        var stdH = 90;
        addPlus( 0, ypos + 0);
        addMinus( 0, ypos + 30);
        widgets['tile'] = createTile(sx, ypos, 100, stdH, prefix(type), updateViz);
        widgets['pitches'] = createHistogram('Pitch', 'pitches', 120, ypos, 120, stdH, 0, 1, 12);
        widgets['timbre'] = createHistogram('Timbre', 'timbre', 120 + 140, ypos, 120, stdH, -75, 75, 12);
        widgets['loudness'] = createLoudnessPlot(120 + 280, ypos, 120, stdH);
        widgets['confidence'] = createConfidencePlot(120 + 420, ypos, 40, stdH);
    }

    function genViz() {
        var height = 150;
        paper = Raphael(div.get(0), minWidth, height);
        var q = track.analysis[type][which];

        paper.clear();

        addPlay( 0, margin - 5);
        widgets['song'] = createSongSelector(paper, margin + 10, margin, 800, 20, type, 0);


        genQuantumPanel(sy, 'main');
    }

    function updateViz(q) {
        curQ = q;
        for (var k in widgets) {    
            var widget = widgets[k];
            widget.update(q);
        }

        if (vizCallback) {
            vizCallback(q);
        }
    }

    function updateVizInList(q, list) {
        curQ = q;
        for (var i = 0; i < list.length; i++) {
            var key = list[i];
            var widget = widgets[key];
            widget.update(q);
        }
    }

    function startPlaying() {
        if (!isPlaying) {
            isPlaying = true;
            playButtonPath.attr('path', stopPath);
            function playNext() {
                if (isPlaying) {
                    curQ = curQ.next;
                    if (curQ) {
                        updateViz(curQ);
                        playNow(curQ);
                        setTimeout(playNext, curQ.duration * 1000);
                    }
                }
            }
            stateCallback(isPlaying);
            playNext();
        }
    }

    function stopPlaying() {
        if (isPlaying) {
            isPlaying = false;
            playButtonPath.attr('path', playPath);
            player.stop();
            stateCallback(isPlaying);
        }
    }

    genViz();
    updateViz( track.analysis[type][which]);

    var ret = {
        play: startPlaying,
        stop: stopPlaying,
        rewind: function() {
            which = 0;
            curQ = track.analysis[type][which];
        },
        isPlaying: function () {
            return isPlaying;
        },
    };

    return ret;
}


function addExample(divName, caption, type, which, playCallback, vizCallback, stateCallback) {
    var captionDiv = $(divName).find('.caption');
    var widgetDiv = $(divName).find('.widget');
    captionDiv.text(caption);
    return renderViz(widgetDiv, type, which, playCallback, vizCallback, stateCallback);
}


function catPath(path, cmd, x, y) {
    return path += cmd + Math.round(x) + ' ' + Math.round(y);
}

function emptyArray(size) {
    var arry = [];

    for (var i = 0; i < size; i++) {
        arry.push(0);
    }

    return arry;
}


function convert(value) { 
    var integer = Math.round(value);
    var str = Number(integer).toString(16); 
    return str.length == 1 ? "0" + str : str; 
};

function to_rgb(r, g, b) { 
    return "#" + convert(r) + convert(g) + convert(b); 
}


function initSegViz(t, playCallback, vizCallback, stateCallback) {
    track = t;
    normalizeColor();
    return addExample($('#seg-viz'), "Under the hood", 'segments', 0,  
        playCallback, vizCallback, stateCallback);
}

