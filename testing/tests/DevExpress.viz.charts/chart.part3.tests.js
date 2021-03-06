"use strict";

var $ = require("jquery"),
    vizMocks = require("../../helpers/vizMocks.js"),
    commons = require("./chartParts/commons.js"),
    rangeModule = require("viz/translators/range"),
    rendererModule = require("viz/core/renderers/renderer"),
    legendModule = require("viz/components/legend"),
    translator2DModule = require("viz/translators/translator2d"),
    crosshairModule = require("viz/chart_components/crosshair"),
    trackerModule = require("viz/chart_components/tracker"),
    Translator = vizMocks.stubClass(translator2DModule.Translator2D),
    chartModule = require("viz/chart");

/* global MockSeries, MockPoint, seriesMockData, categories, commonMethodsForTests */
require("../../helpers/chartMocks.js");

$('<div id="chartContainer">').appendTo("#qunit-fixture");

var checkTranslatorsCount = commonMethodsForTests.checkTranslatorsCount;

function checkSegmentRectCommon(assert, chart, i, x1, y1, w, h, fill, dashStyle, stroke, strokeWidth, strokeOpacity, segments) {
    assert.equal(chart._renderer.path.getCall(i).args[0][0], x1, "x");
    assert.equal(chart._renderer.path.getCall(i).args[0][1], y1, "y");
    assert.equal(chart._renderer.path.getCall(i).args[0][2], w, "width");
    assert.equal(chart._renderer.path.getCall(i).args[0][3], h, "height");
    assert.equal(chart._renderer.path.getCall(i).args[1].top, segments.top, "top segment");
    assert.equal(chart._renderer.path.getCall(i).args[1].left, segments.left, "left segment");
    assert.equal(chart._renderer.path.getCall(i).args[1].right, segments.right, "right segment");
    assert.equal(chart._renderer.path.getCall(i).args[1].bottom, segments.bottom, "bottom segment");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0].fill, fill, "fill");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0].dashStyle, dashStyle, "dashStyle");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0].stroke, stroke, "stroke");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0]["stroke-width"], strokeWidth, "strokeWidth");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0]["stroke-opacity"], strokeOpacity, "strokeOpacity");
    assert.equal(chart._renderer.path.getCall(i).returnValue.attr.firstCall.args[0]["stroke-linecap"], "square");
}

function getObjectData(object) {
    var propertyName,
        result = {};
    for(propertyName in object) {
        if(typeof object[propertyName] !== "function") {
            if(typeof object[propertyName] === "number") {
                result[propertyName] = Number(object[propertyName].toFixed(5));
            } else {
                result[propertyName] = object[propertyName];
            }
        }
    }
    return result;
}

function compareBusinessRanges(assert, range1, range2) {
    assert.deepEqual(getObjectData(range1), getObjectData(range2));
}

QUnit.module("dxChart Translators", $.extend({}, commons.environment, {
    beforeEach: function() {
        commons.environment.beforeEach.call(this);

        this.createTranslator2D = sinon.stub(translator2DModule, "Translator2D", function() {
            return new Translator();
        });
    },
    afterEach: function() {
        commons.environment.afterEach.call(this);
        this.createTranslator2D.restore();
    }
}));

QUnit.test("Translator created for single business range", function(assert) {
    seriesMockData.series.push(new MockSeries({
        range: {
            val: {
                min: 1,
                max: 3
            },
            arg: {
                min: 2,
                max: 8
            }
        }
    }));
    var chart = this.createChart({
        margin: {
            left: 0,
            right: 5,
            top: 3,
            bottom: 4
        },
        series: {
            type: "line"
        }
    });
    //assert
    assert.ok(chart.translators);
    assert.ok(this.createTranslator2D.calledTwice);
    checkTranslatorsCount(assert, chart.translators, 1, [1]);
    var translators = chart.translators["default"][chart._valueAxes[0].name];

    var translator = translators.val;
    //main translator which is used by series and axes
    assert.strictEqual(translator.pane, "default");
    compareBusinessRanges(assert, this.createTranslator2D.firstCall.args[0], new rangeModule.Range(chart.businessRanges[0].val), "business range");
    assert.deepEqual(this.createTranslator2D.firstCall.args[1], chart._canvas, "translator canvas");
    //main translator which is used by series and axes
    compareBusinessRanges(assert, this.createTranslator2D.lastCall.args[0], new rangeModule.Range(chart.businessRanges[0].arg), "business range");
    assert.deepEqual(this.createTranslator2D.lastCall.args[1], chart._canvas, "translator canvas");
});

QUnit.test("Translator businessRange after update", function(assert) {
    seriesMockData.series.push(new MockSeries({
        range: {
            val: {
                min: 1,
                max: 3
            },
            arg: {
                min: 2,
                max: 8
            }
        }
    }));
    var chart = this.createChart({
        margin: {
            left: 0,
            right: 5,
            top: 3,
            bottom: 4
        },
        series: {
            type: "line"
        }
    });
    chart._argumentAxes[0].getTranslator = sinon.stub().returns({ getBusinessRange: sinon.stub().returns({}) });
    chart.translators["default"][chart._valueAxes[0].name].arg._originalBusinessRange = {};
    chart.translators["default"][chart._valueAxes[0].name].val._originalBusinessRange = {};

    chart.translators["default"][chart._valueAxes[0].name].arg.updateBusinessRange.reset();
    chart.translators["default"][chart._valueAxes[0].name].val.updateBusinessRange.reset();

    //act
    chart.zoomArgument(4, 6);
    //assert
    assert.ok(chart.translators);
    checkTranslatorsCount(assert, chart.translators, 1, [1]);
    assert.ok(this.createTranslator2D.calledTwice);
    var translators = chart.translators["default"][chart._valueAxes[0].name];

    var translator = translators.val;
    //main translator which is used by series and axes
    assert.strictEqual(translator.pane, "default");
    assert.ok(translator.updateBusinessRange.calledTwice);
    compareBusinessRanges(assert, translator.updateBusinessRange.firstCall.args[0], new rangeModule.Range(chart.businessRanges[0].val), "business range");
    assert.ok(!translator._originalBusinessRange);


    translator = translators.arg;
    //main translator which is used by series and axes
    assert.ok(translator.updateBusinessRange.calledTwice);
    compareBusinessRanges(assert, translator.updateBusinessRange.firstCall.args[0], new rangeModule.Range(chart.businessRanges[0].arg), "business range");
    assert.ok(!translator._originalBusinessRange);
});

QUnit.test("Translator businessRange after update not apply value margins", function(assert) {
    seriesMockData.series.push(new MockSeries({
        range: {
            val: {
                min: 1,
                max: 3
            },
            arg: {
                min: 2,
                max: 8
            }
        }
    }));

    var chart = this.createChart({
        series: {
            type: "line"
        }
    });
    chart._argumentAxes[0].getTranslator = sinon.stub().returns({ getBusinessRange: sinon.stub().returns({}) });

    chart.translators["default"][chart._valueAxes[0].name].arg._originalBusinessRange = {};
    chart.translators["default"][chart._valueAxes[0].name].val._originalBusinessRange = {};

    chart.translators["default"][chart._valueAxes[0].name].arg.updateBusinessRange.reset();
    chart.translators["default"][chart._valueAxes[0].name].val.updateBusinessRange.reset();

    //act
    chart.zoomArgument(4, 6, true);
    //assert
    assert.ok(chart.translators);
    checkTranslatorsCount(assert, chart.translators, 1, [1]);
    assert.ok(this.createTranslator2D.calledTwice);
    var translators = chart.translators["default"][chart._valueAxes[0].name];

    var translator = translators.val;
    //main translator which is used by series and axes
    assert.strictEqual(translator.pane, "default");
    assert.ok(translator.updateBusinessRange.calledTwice);
    compareBusinessRanges(assert, translator.updateBusinessRange.firstCall.args[0], new rangeModule.Range(chart.businessRanges[0].val), "business range");
    assert.ok(!translator._originalBusinessRange);


    translator = translators.arg;
    //main translator which is used by series and axes
    assert.ok(translator.updateBusinessRange.calledTwice);
    compareBusinessRanges(assert, translator.updateBusinessRange.firstCall.args[0], new rangeModule.Range($.extend({}, chart.businessRanges[0].arg, {
        max: 8,
        min: 2
    })), "business range");
    assert.ok(!translator._originalBusinessRange);
});

///////////////////////////////////////////////////////
//////      Axes
///////////////////////////////////////////////////////
QUnit.module("Axes", commons.environment);

QUnit.test("Create Horizontal Category Axis, Vertical Continuous axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    var argumentAxis,
        valueAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);
    argumentAxis = chart._argumentAxes[0];

    assert.ok(argumentAxis.getOptions().categories, "Categories should be assigned");
    assert.deepEqual(argumentAxis.getOptions().categories, categories);
    assertCommonAxesProperties(assert, argumentAxis, {});

    valueAxis = chart._valueAxes[0];
    assert.ok(!valueAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, valueAxis, {});
    assert.equal(this.themeManager.getOptions.withArgs("argumentAxis").callCount, 1);
    assert.equal(this.themeManager.getOptions.withArgs("argumentAxis").lastCall.args[2], false);
    assert.equal(this.themeManager.getOptions.withArgs("valueAxis").callCount, 1);
    assert.equal(this.themeManager.getOptions.withArgs("valueAxis").lastCall.args[2], false);
});

//B254993
QUnit.test("Argument axis is empty array", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { minY: 1, maxY: 3 }
    });
    seriesMockData.series.push(stubSeries);
    var argumentAxis;

    //act
    var chart = this.createChart({
        argumentAxis: [],
        series: [],
        valueAxis: []
    });

    assert.ok(chart._argumentAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    argumentAxis = chart._argumentAxes[0];
    assertCommonAxesProperties(assert, argumentAxis, {});
});

//B254993
QUnit.test("Value axis is empty array", function(assert) {
    var stubSeries = new MockSeries({
        range: { minY: 1, maxY: 3 }
    });
    seriesMockData.series.push(stubSeries);

    var chart = this.createChart({
        valueAxis: [],
        series: []
    });

    assert.ok(chart._valueAxes);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);
});

QUnit.test("create axes with crosshair", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        crosshair: {
            enabled: true,
            horizontalLine: {
                visible: true
            },
            verticalLine: {
                visible: true
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0].getOptions().crosshairEnabled);
    assert.ok(chart._valueAxes[0].getOptions().crosshairEnabled);
});

QUnit.test("create axes with crosshair. horizontal line is invisible", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        crosshair: {
            enabled: true,
            horizontalLine: {
                visible: false
            },
            verticalLine: {
                visible: true
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0].getOptions().crosshairEnabled);
    assert.strictEqual(chart._valueAxes[0].getOptions().crosshairEnabled, false);
});

QUnit.test("create axes with crosshair. horizontal line is invisible. rotated", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        rotated: true,
        crosshair: {
            enabled: true,
            horizontalLine: {
                visible: false
            },
            verticalLine: {
                visible: true
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.strictEqual(chart._argumentAxes[0].getOptions().crosshairEnabled, false);
    assert.ok(chart._valueAxes[0].getOptions().crosshairEnabled);
});

QUnit.test("create axes with crosshair. vertical line is invisible", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        crosshair: {
            enabled: true,
            verticalLine: {
                visible: false
            },
            horizontalLine: {
                visible: true
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.strictEqual(chart._argumentAxes[0].getOptions().crosshairEnabled, false);
    assert.ok(chart._valueAxes[0].getOptions().crosshairEnabled);
});

QUnit.test("create axes with crosshair. vertical line is invisible. rotated", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        rotated: true,
        crosshair: {
            enabled: true,
            verticalLine: {
                visible: false
            },
            horizontalLine: {
                visible: true
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0].getOptions().crosshairEnabled);
    assert.strictEqual(chart._valueAxes[0].getOptions().crosshairEnabled, false);
});

QUnit.test("Create Horizontal Continuous Axis, Vertical Continuous axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    var argumentAxis,
        valueAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            min: 10,
            max: 20,
            minValueMargin: 0,
            maxValueMargin: 0,
            mockRange: {
                min: 10,
                max: 20,
                minValueMargin: 0,
                maxValueMargin: 0,
                minValueMarginPriority: 50,
                maxValueMarginPriority: 50
            },
            setTicksAtUnitBeginning: false
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);

    argumentAxis = chart._argumentAxes[0];
    assert.ok(!argumentAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, argumentAxis, { setTicksAtUnitBeginning: false });

    valueAxis = chart._valueAxes[0];
    assert.ok(!valueAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, valueAxis, {});
});

QUnit.test("Create Horizontal Continuous Axis, Vertical Continuous axis (horizontal range goes from series)", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 }, arg: { min: 10, max: 20 } }
    });
    seriesMockData.series.push(stubSeries);
    var argumentAxis,
        valueAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            minValueMargin: 0,
            maxValueMargin: 0,
            mockRange: {
                minValueMargin: 0,
                maxValueMargin: 0,
                minValueMarginPriority: 50,
                maxValueMarginPriority: 50
            }
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._argumentAxes);
    assert.ok(chart._valueAxes);
    assert.equal(chart._argumentAxes.length, 1);
    assert.equal(chart._valueAxes.length, 1);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);

    argumentAxis = chart._argumentAxes[0];
    assert.ok(!argumentAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, argumentAxis, {});

    valueAxis = chart._valueAxes[0];
    assert.ok(!valueAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, valueAxis, {});
});

QUnit.test("Create Vertical Category Axis, Horizontal Continuous axis (rotated)", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    var valueAxis,
        argumentAxis;

    //act
    var chart = this.createChart({
        rotated: true,
        argumentAxis: {
            categories: categories,
            setTicksAtUnitBeginning: false
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._valueAxes);
    assert.ok(chart._argumentAxes);
    assert.equal(chart._valueAxes.length, 1);
    assert.equal(chart._argumentAxes.length, 1);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);

    argumentAxis = chart._argumentAxes[0];
    assert.ok(argumentAxis.getOptions().categories, "Categories should be assigned");
    assert.deepEqual(argumentAxis.getOptions().categories, categories);
    assertCommonAxesProperties(assert, argumentAxis, { setTicksAtUnitBeginning: false });

    valueAxis = chart._valueAxes[0];
    assert.ok(!valueAxis.getOptions().categories, "Categories should not be assigned");
    assertCommonAxesProperties(assert, valueAxis, {});

    assert.equal(this.themeManager.getOptions.withArgs("argumentAxis").callCount, 1);
    assert.equal(this.themeManager.getOptions.withArgs("argumentAxis").lastCall.args[2], true);
    assert.equal(this.themeManager.getOptions.withArgs("valueAxis").callCount, 1);
    assert.equal(this.themeManager.getOptions.withArgs("valueAxis").lastCall.args[2], true);

});

QUnit.test("Create Vertical Continuous Axis, Horizontal Continuous axis (rotated)", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    var valueAxis,
        argumentAxis;

    //act
    var chart = this.createChart({
        rotated: true,
        argumentAxis: {
            min: 10,
            max: 20
        },
        series: {
            type: "line"
        }
    });

    assert.ok(chart._valueAxes);
    assert.ok(chart._argumentAxes);
    assert.equal(chart._valueAxes.length, 1);
    assert.equal(chart._argumentAxes.length, 1);
    assert.ok(chart._valueAxes[0]);
    assert.ok(chart._argumentAxes[0]);
    assert.ok(chart._valueAxes[0]._stripsGroup);
    assert.ok(chart._argumentAxes[0]._stripsGroup);
    assert.ok(chart._valueAxes[0]._constantLinesGroup);
    assert.ok(chart._argumentAxes[0]._constantLinesGroup);
    assert.ok(chart._valueAxes[0].gridGroup);

    argumentAxis = chart._argumentAxes[0];
    assert.ok(!argumentAxis.getOptions().categories);
    assert.equal(argumentAxis.getOptions().min, 10, "Vertical min");
    assert.equal(argumentAxis.getOptions().max, 20, "Vertical max");
    assertCommonAxesProperties(assert, argumentAxis, {});

    valueAxis = chart._valueAxes[0];
    assert.ok(!valueAxis.getOptions().categories);
    assertCommonAxesProperties(assert, valueAxis, {});
});

QUnit.test("Panes - named Horizontal Category Axis, named Vertical Continuous axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "topPane"
        },
        valueAxis: {
            pane: "topPane",
            setTicksAtUnitBeginning: false
        },
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }]
    });

    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "topPane" });
    assertCommonAxesProperties(assert, chart._valueAxes[0], { pane: "topPane", setTicksAtUnitBeginning: false });
});

QUnit.test("Panes - single pane specified, replace default for Horizontal Category Axis, Vertical Continuous axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories
        },
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }]
    });

    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "topPane" });
    assertCommonAxesProperties(assert, chart._valueAxes[0], { pane: "topPane" });
});

//duplicate
QUnit.test("Panes - two panes, replace default for Horizontal Category Axis, Vertical Continuous axis, duplicate vertical axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    var argumentAxis,
        valueAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "bottomPane"
        },
        valueAxis: {
            min: 1
        },
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });

    assert.equal(chart._argumentAxes.length, 2, "Axis should be duplicated");
    argumentAxis = chart._argumentAxes[0];
    assertCommonAxesProperties(assert, argumentAxis, { pane: "topPane" });
    assert.ok(argumentAxis._stripsGroup);
    assert.ok(argumentAxis._constantLinesGroup);

    argumentAxis = chart._argumentAxes[1];
    assertCommonAxesProperties(assert, argumentAxis, { pane: "bottomPane" });
    assert.ok(argumentAxis._stripsGroup);
    assert.ok(argumentAxis._constantLinesGroup);

    assert.equal(chart._valueAxes.length, 2, "Axis is not specific for pane and should be duplicated");
    valueAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, valueAxis, { pane: "topPane" });
    assert.ok(valueAxis._stripsGroup);
    assert.ok(valueAxis._constantLinesGroup);
    assert.strictEqual(valueAxis.getOptions().min, 1, "Min values goes from common options");

    valueAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, valueAxis, { pane: "bottomPane" });
    assert.ok(valueAxis._stripsGroup);
    assert.ok(valueAxis._constantLinesGroup);
    assert.strictEqual(valueAxis.getOptions().min, 1, "Min values goes from common options");
});
//only one
QUnit.test("Panes - two panes, replace default for Horizontal Category Axis, Vertical Continuous axis", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "bottomPane"
        },
        //this axis is specific for top pane and should not be duplicated
        valueAxis: {
            pane: "topPane"
        },
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });

    assert.equal(chart._argumentAxes.length, 2, "Axis should not duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "topPane" });
    assertCommonAxesProperties(assert, chart._argumentAxes[1], { pane: "bottomPane" });

    assertCommonAxesProperties(assert, chart._valueAxes[0], { pane: "topPane" });
});

QUnit.test("Panes - Percent format for pane with full stacked series", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    seriesMockData.series.push(stubSeries);
    var valueAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "bottomPane"
        },
        valueAxis: [{
            pane: "topPane"
        }, {
            pane: "bottomPane"
        }],
        series: [
            {},
            { type: "fullstackedbar" }
        ],
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });

    assert.equal(chart._argumentAxes.length, 2, "Axis should be duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "topPane" });
    assertCommonAxesProperties(assert, chart._argumentAxes[1], { pane: "bottomPane" });

    assert.equal(chart._valueAxes.length, 2, "Both axis specified and should be created");
    valueAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, valueAxis, { pane: "topPane" });
    assert.ok(!valueAxis.percentLabelFormat);
    assert.ok(valueAxis.resetAutoFormat);

    valueAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, valueAxis, { pane: "bottomPane" });
    assert.ok(valueAxis.percentLabelFormat);
    assert.ok(!valueAxis.resetAutoFormat);
});

QUnit.test("Panes - Percent format for pane with two axes", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    seriesMockData.series.push(stubSeries);
    var verticalAxis;

    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories
        },
        valueAxis: [{
            name: "axis1"
        }, {
            name: "axis2"
        }],
        series: [
            {
                axis: "axis1",
                type: "line"
            },
            {
                type: "fullstackedbar",
                axis: "axis2"
            }
        ]
    });

    assert.equal(chart._argumentAxes.length, 1, "Axis should not be duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "default" });

    assert.equal(chart._valueAxes.length, 2, "Both axis specified and should be created");
    verticalAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, verticalAxis, { pane: "default" });
    assert.ok(!verticalAxis.percentLabelFormat);

    verticalAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, verticalAxis, { pane: "default" });
    assert.ok(verticalAxis.percentLabelFormat);
});

QUnit.test("Panes - Percent format for pane with two axes. Rotated", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { arg: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    seriesMockData.series.push(stubSeries);
    var horizontalAxis;

    //act
    var chart = this.createChart({
        rotated: true,
        argumentAxis: {
            categories: categories
        },
        valueAxis: [{
            name: "axis1"
        }, {
            name: "axis2"
        }],
        series: [
            {
                axis: "axis1",
                type: "line"
            },
            {
                type: "fullstackedbar",
                axis: "axis2"
            }
        ]
    });

    assert.equal(chart._argumentAxes.length, 1, "Axis should not be duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "default" });

    assert.equal(chart._valueAxes.length, 2, "Both axis specified and should be created");
    horizontalAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, horizontalAxis, { pane: "default" });
    assert.ok(!horizontalAxis.percentLabelFormat);

    horizontalAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, horizontalAxis, { pane: "default" });
    assert.ok(horizontalAxis.percentLabelFormat);
});


QUnit.test("Panes - Percent format for pane with full stacked series. Rotated", function(assert) {
    //Arrange
    var stubSeries = new MockSeries({
        range: { arg: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);
    seriesMockData.series.push(stubSeries);
    var horizontalAxis;

    //act
    var chart = this.createChart({
        rotated: true,
        argumentAxis: {
            categories: categories,
            pane: "bottomPane"
        },
        valueAxis: [{
            pane: "topPane"
        }, {
            pane: "bottomPane"
        }],
        series: [{ type: "line" },
            { type: "fullstackedbar" }
        ],
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });
    //horizontalAxes
    assert.equal(chart._argumentAxes.length, 2, "Axis should be duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "bottomPane" });
    assertCommonAxesProperties(assert, chart._argumentAxes[1], { pane: "topPane" });

    assert.equal(chart._valueAxes.length, 2, "Both axis specified and should be created");
    horizontalAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, horizontalAxis, { pane: "topPane" });
    assert.ok(!horizontalAxis.percentLabelFormat);

    horizontalAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, horizontalAxis, { pane: "bottomPane" });
    assert.ok(horizontalAxis.percentLabelFormat);
});

//two different
QUnit.test("Panes - two panes, replace default for Horizontal Category Axis, Vertical Continuous axis, both vertical axis specified", function(assert) {
    var stubSeries = new MockSeries({
        range: { val: { min: 1, max: 3 } }
    });
    seriesMockData.series.push(stubSeries);

    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "bottomPane",
            setTicksAtUnitBeginning: false
        },
        valueAxis: [{
            pane: "topPane",
            min: 1,
            setTicksAtUnitBeginning: false,
            title: "axisForTopPane"
        }, {
            pane: "bottomPane",
            min: 10,
            title: "axisForBottomPane"
        }],
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });

    assert.equal(chart._argumentAxes.length, 2, "Axis be duplicated");
    assertCommonAxesProperties(assert, chart._argumentAxes[0], { pane: "topPane", setTicksAtUnitBeginning: false });
    assertCommonAxesProperties(assert, chart._argumentAxes[1], { pane: "bottomPane", setTicksAtUnitBeginning: false });

    assert.equal(chart._valueAxes.length, 2, "Both axis specified and should be created");
    var verticalAxis = chart._valueAxes[0];
    assertCommonAxesProperties(assert, verticalAxis, { pane: "topPane", setTicksAtUnitBeginning: false });
    assert.strictEqual(verticalAxis.getOptions().min, 1, "Min values goes from top axis options");

    verticalAxis = chart._valueAxes[1];
    assertCommonAxesProperties(assert, verticalAxis, { pane: "bottomPane" });
    assert.strictEqual(verticalAxis.getOptions().min, 10, "Min values goes from bottom axis options");
});

QUnit.test("Panes check duplicate argument axis for each pane", function(assert) {
    //arrange
    var stubSeries1 = new MockSeries({}),
        stubSeries2 = new MockSeries({});
    seriesMockData.series.push(stubSeries1);
    seriesMockData.series.push(stubSeries2);
    //act
    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            grid: {
                visible: true
            },
            title: "Title"
        },
        panes: [{
            name: "top"
        }, {
            name: "bottom"
        }],
        series: [{
            pane: "top",
            type: "line"
        }, {
            type: "line"
        }]
    });
    //assert
    assert.ok(chart.series);
    assert.equal(chart._argumentAxes.length, 2);
    assert.equal(chart._argumentAxes[0].pane, "top");
    assert.equal(chart._argumentAxes[1].pane, "bottom");
    assert.equal(chart.defaultPane, "bottom");

    assert.equal(chart._argumentAxes[0].getOptions().grid.visible, true);
    assert.equal(chart._argumentAxes[1].getOptions().grid.visible, true);

    var axisOptions = chart._argumentAxes[0].getOptions();

    assert.strictEqual(axisOptions.visible, false);
    assert.strictEqual(axisOptions.tick.visible, false);
    assert.strictEqual(axisOptions.label.visible, false);
    assert.strictEqual(axisOptions.minorTick.visible, false);
    assert.deepEqual(axisOptions.title, {});

    axisOptions = chart._argumentAxes[1].getOptions();

    assert.strictEqual(axisOptions.visible, undefined);
    assert.deepEqual(axisOptions.tick, {});
    assert.deepEqual(axisOptions.label, {});
    assert.deepEqual(axisOptions.minorTick, {});
    assert.equal(axisOptions.title, "Title");

});

QUnit.test("Title for Axes - initialization as String ", function(assert) {
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var verticalAxis;

    var chart = this.createChart({
        argumentAxis: {
            categories: categories,
            pane: "bottomPane"
        },
        valueAxis: [{
            pane: "topPane",
            title: "title of valueAxis for topPane"
        }, {
            pane: "bottomPane",
            title: "title of valueAxis for bottomPane"
        }],
        series: {
            type: "line"
        },
        panes: [{
            name: "topPane"
        }, {
            name: "bottomPane"
        }]
    });

    assert.equal(chart._argumentAxes.length, 2);

    assert.equal(chart._valueAxes.length, 2);
    verticalAxis = chart._valueAxes[0];
    assert.strictEqual(verticalAxis.getOptions().pane, "topPane");

    verticalAxis = chart._valueAxes[1];
    assert.strictEqual(verticalAxis.getOptions().pane, "bottomPane");
});

function assertCommonAxesProperties(assert, axis, options) {
    options = options || {};
    assert.ok(axis._renderer, "Renderer should be passed into axis");
    assert.strictEqual(axis.getOptions().setTicksAtUnitBeginning, options.setTicksAtUnitBeginning, "setTicksAtUnitBeginning option for datetimeCalculator");
    assert.strictEqual(axis.getOptions().pane, options.pane || "default", "Default pane name");
}

////////////////////////////////////////
////////////////////////////////////////

QUnit.module("Legend creation", $.extend({}, commons.environment, {
    beforeEach: function() {
        commons.environment.beforeEach.call(this);
        this.clock = sinon.useFakeTimers();
    },
    afterEach: function() {
        commons.environment.afterEach.call(this);
        this.clock.restore();
    }
}));

QUnit.test("Create Horizontal Legend with single named series, position = outside", function(assert) {
    //arrange
    var stubSeries = new MockSeries({
        name: "First series",
        visible: true,
        showInLegend: true
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({ series: { type: "line" } });

    //assert
    var legendCtorArgs = legendModule.Legend.lastCall.args[0],
        legend = commons.getLegendStub(),
        updateCall = legend.update.lastCall;

    assert.deepEqual(chart.layoutManager.layoutElements.lastCall.args[0], [commons.getTitleStub(), legend], "legend and title layouted");
    assert.deepEqual(chart.layoutManager.layoutElements.lastCall.args[1], chart._canvas, "legend and title layouted - canvas");

    assert.strictEqual(updateCall.args[1]._incidentOccurred, chart._incidentOccurred, "pass incidentOccurred function");
    assert.strictEqual(updateCall.args[0][0].text, "First series", "Correct text for series");
    assert.deepEqual(updateCall.args[0][0].states, { hover: undefined, selection: undefined, normal: {} }, "States");

    assert.strictEqual(legendCtorArgs.renderer, rendererModule.Renderer.lastCall.returnValue, "Correct renderer was passed to legend");
    assert.strictEqual(legendCtorArgs.backgroundClass, "dxc-border", "background class");
    assert.strictEqual(legendCtorArgs.itemGroupClass, "dxc-item", "item group class");
    assert.strictEqual(legendCtorArgs.textField, "seriesName", "text field");
    assert.ok($.isFunction(legendCtorArgs.getFormatObject), true, "getFormatObject is function");
    assert.deepEqual(legendCtorArgs.getFormatObject({
        id: "id",
        text: "text",
        states: {
            hover: undefined,
            selection: undefined,
            normal: {
                fill: "fill"
            }
        }
    }), {
        seriesColor: "fill",
        seriesIndex: "id",
        seriesName: "text"
    }, "correct getFormatObject function");
});

QUnit.test("Create chart with bottom title. Not header block", function(assert) {
    //arrange
    var stubSeries = new MockSeries({
        name: "First series",
        visible: true,
        showInLegend: true
    });
    seriesMockData.series.push(stubSeries);

    //act
    var chart = this.createChart({
        series: {
            type: "line"
        },
        title: {
            verticalAlignment: "bottom"
        }
    });

    //assert
    var legend = commons.getLegendStub();

    assert.deepEqual(chart.layoutManager.layoutElements.lastCall.args[0], [commons.getTitleStub(), legend], "legend and title layouted");
});

QUnit.test("Hidden marker for simple series. First drawing", function(assert) {
    //arrange
    var stubSeries = new MockSeries({
        name: "First series",
        visible: false,
        showInLegend: true
    });

    seriesMockData.series.push(stubSeries);

    //act
    this.createChart({ series: { type: "line" } });

    //assert
    var legend = commons.getLegendStub();

    assert.strictEqual(legend.update.lastCall.args[0][0].textOpacity, 0.3, "Text opacity is correct");
    assert.strictEqual(legend.update.lastCall.args[0][0].states.normal.opacity, 0.3, "Opacity is correct");
});

QUnit.test("Hidden marker for simple series. Opacity < 0.3", function(assert) {
    var stubSeries = new MockSeries({
        name: "First series",
        visible: false,
        opacity: 0.1,
        showInLegend: true
    });

    seriesMockData.series.push(stubSeries);

    //act
    this.createChart({ series: { type: "line" } });

    //assert
    var legend = commons.getLegendStub();

    assert.strictEqual(legend.update.lastCall.args[0][0].textOpacity, 0.3, "Text opacity is correct");
    assert.strictEqual(legend.update.lastCall.args[0][0].states.normal.opacity, 0.1, "Opacity is correct");
});

QUnit.test("Legend visible after zooming", function(assert) {
    var chart = this.createChart({
        legend: {
            position: "inside"
        }
    });
    chart.zoomArgument(300, 500);

    assert.equal(this.layoutManager.layoutElements.callCount, 2);
    assert.deepEqual(this.layoutManager.layoutElements.lastCall.args[0], []);
});

QUnit.module("dxChart Title", commons.environment);

QUnit.test("Draw title (text is not specified)", function(assert) {
    var chartOptions = {
        width: 800,
        height: 800,
        left: 80,
        right: 90,
        top: 10,
        bottom: 80
    };
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var chart = this.createChart({
        margin: chartOptions,
        title: {},
        subtitle: "subtitle"
    });

    assert.ok(!chart._renderer.stub("text").called);
});

QUnit.module("Panes backgroundColor", commons.environment);

QUnit.test("CommonPaneSetting. Background color", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 60,
    //    right: 50,
    //    top: 20,
    //    bottom: 80
    //};
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var chart = this.createChart({
        size: {
            width: 800,
            height: 800
        },
        margin: {
            left: 60,
            right: 50,
            top: 20,
            bottom: 80
        },
        commonPaneSettings: {
            backgroundColor: "red"
        }
    });

    assert.ok(chart.panesBackground);
    assert.equal(chart.panesBackground.length, 1);
    assert.equal(chart.panesBackground[0]._stored_settings.x, 60);
    assert.equal(chart.panesBackground[0]._stored_settings.y, 20);
    assert.equal(chart.panesBackground[0]._stored_settings.width, 690);
    assert.equal(chart.panesBackground[0]._stored_settings.height, 700);
    assert.equal(chart.panesBackground[0].attr.firstCall.args[0].fill, "red");
    assert.equal(chart.panesBackground[0].attr.firstCall.args[0]["stroke-width"], 0);
});

QUnit.test("CommonPaneSetting. Background color. Two panes. second pane has background", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 60,
    //    right: 50,
    //    top: 20,
    //    bottom: 80
    //};
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var chart = this.createChart({
        size: {
            width: 800,
            height: 800
        },
        margin: {
            left: 60,
            right: 50,
            top: 20,
            bottom: 80
        },
        commonPaneSettings: {
            backgroundColor: "red"
        },
        panes: [{ name: "pane1" }, { name: "pane2", backgroundColor: "green" }]
    });

    assert.ok(chart.panesBackground);
    assert.equal(chart.panesBackground.length, 2);
    assert.equal(chart.panesBackground[0]._stored_settings.x, 60);
    assert.equal(chart.panesBackground[0]._stored_settings.y, 20);
    assert.equal(chart.panesBackground[0]._stored_settings.width, 690);
    assert.equal(chart.panesBackground[0]._stored_settings.height, 700);
    assert.equal(chart.panesBackground[0].attr.firstCall.args[0].fill, "red");
    assert.equal(chart.panesBackground[0].attr.firstCall.args[0]["stroke-width"], 0);

    assert.equal(chart.panesBackground[1]._stored_settings.x, 60);
    assert.equal(chart.panesBackground[1]._stored_settings.y, 20);
    assert.equal(chart.panesBackground[1]._stored_settings.width, 690);
    assert.equal(chart.panesBackground[1]._stored_settings.height, 700);
    assert.equal(chart.panesBackground[1].attr.firstCall.args[0].fill, "green");
    assert.equal(chart.panesBackground[1].attr.firstCall.args[0]["stroke-width"], 0);
});

QUnit.test("CommonPaneSetting. Background color. Two panes. Both panes has background", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 60,
    //    right: 50,
    //    top: 20,
    //    bottom: 80
    //};
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var chart = this.createChart({
        size: {
            width: 800,
            height: 800
        },
        margin: {
            left: 60,
            right: 50,
            top: 20,
            bottom: 80
        },
        commonPaneSettings: {
            backgroundColor: "red"
        },
        panes: [{ name: "pane1", backgroundColor: "white" }, { name: "pane2", backgroundColor: "green" }]
    });

    assert.ok(chart.panesBackground);
    assert.equal(chart.panesBackground.length, 2);
    assert.equal(chart.panesBackground[0].attr.firstCall.args[0].fill, "white");
    assert.equal(chart.panesBackground[1].attr.firstCall.args[0].fill, "green");
});

QUnit.test("CommonPaneSetting. Background color. Two panes. First pane has background is none", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 60,
    //    right: 50,
    //    top: 20,
    //    bottom: 80
    //};
    var stubSeries = new MockSeries();
    seriesMockData.series.push(stubSeries);
    var chart = this.createChart({
        size: {
            width: 800,
            height: 800
        },
        margin: {
            left: 60,
            right: 50,
            top: 20,
            bottom: 80
        },
        commonPaneSettings: {
            backgroundColor: "red"
        },
        panes: [{ name: "pane1", backgroundColor: "none" }, { name: "pane2" }]
    });

    assert.ok(chart.panesBackground);
    assert.equal(chart.panesBackground.length, 2);
    assert.equal(chart.panesBackground[0], null);
    assert.equal(chart.panesBackground[1].attr.firstCall.args[0].fill, "red");
});

QUnit.module("Panes border preparations", $.extend({}, commons.environment, {
    beforeEach: function() {
        commons.environment.beforeEach.apply(this, arguments);
        this.prepareSegmentRectPoints.restore();
        this.prepareSegmentRectPoints = chartModule._test_prepareSegmentRectPoints();
    },
    afterEach: commons.environment.afterEach
}));

QUnit.test("full rect", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: true, left: true });

    assert.deepEqual(params.points, [1, 2, 31, 2, 31, 42, 1, 42, 1, 2], "top right bottom left");
    assert.deepEqual(params.pathType, "area", "Close path");
});

QUnit.test("w/o top", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: false, right: true, bottom: true, left: true });

    assert.deepEqual(params.points, [31, 2, 31, 42, 1, 42, 1, 2], "right bottom left");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o right", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: false, bottom: true, left: true });

    assert.deepEqual(params.points, [31, 42, 1, 42, 1, 2, 31, 2], "bottom left top");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o bottom", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: false, left: true });

    assert.deepEqual(params.points, [1, 42, 1, 2, 31, 2, 31, 42], "left top right");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o left", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: true, left: false });

    assert.deepEqual(params.points, [1, 2, 31, 2, 31, 42, 1, 42], "top right bottom");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o top & right", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: false, right: false, bottom: true, left: true });

    assert.deepEqual(params.points, [31, 42, 1, 42, 1, 2], "bottom left");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o right & bottom", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: false, bottom: false, left: true });

    assert.deepEqual(params.points, [1, 42, 1, 2, 31, 2], "left top");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o top & right & bottom & left", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: false, right: false, bottom: false, left: false });

    assert.deepEqual(params.points, [], "left top");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o top & bottom", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: false, right: true, bottom: false, left: true });

    assert.deepEqual(params.points[0], [31, 2, 31, 42], "right");
    assert.deepEqual(params.points[1], [1, 42, 1, 2], "left");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("w/o left & right", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: false, bottom: true, left: false });

    assert.deepEqual(params.points[0], [1, 2, 31, 2], "top");
    assert.deepEqual(params.points[1], [31, 42, 1, 42], "bottom");
    assert.deepEqual(params.pathType, "line", "Open path");
});

QUnit.test("full rect. odd border width", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: true, left: true, width: 1 });

    assert.deepEqual(params.points, [1.5, 2.5, 30.5, 2.5, 30.5, 41.5, 1.5, 41.5, 1.5, 2.5], "top right bottom left");
    assert.deepEqual(params.pathType, "area", "Close path");
});

QUnit.test("full rect. odd border width (5)", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: true, left: true, width: 5 });

    assert.deepEqual(params.points, [3.5, 4.5, 28.5, 4.5, 28.5, 39.5, 3.5, 39.5, 3.5, 4.5], "top right bottom left");
    assert.deepEqual(params.pathType, "area", "Close path");
});

QUnit.test("full rect. even border width (4)", function(assert) {
    var params = this.prepareSegmentRectPoints(1, 2, 30, 40, { top: true, right: true, bottom: true, left: true, width: 4 });

    assert.deepEqual(params.points, [3, 4, 29, 4, 29, 40, 3, 40, 3, 4], "top right bottom left");
    assert.deepEqual(params.pathType, "area", "Close path");
});

QUnit.module("Panes border", commons.environment);

QUnit.test("Panes border, default attributes", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 80,
    //    right: 90,
    //    top: 10,
    //    bottom: 80
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 80, right: 90, top: 10, bottom: 80 },
        commonPaneSettings: {
            border: { visible: true }
        }
    });

    assert.ok(chart.panes);
    assert.equal(chart.panes.length, 1);
    assert.equal(chart._renderer.path.callCount, 1);
    checkSegmentRectCommon(assert, chart, 0, 80, 10, 630, 710, "none", "solid", undefined, undefined, undefined, { top: true, bottom: true, left: true, right: true });
});

QUnit.test("Panes border, default attributes. Two render", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 80,
    //    right: 90,
    //    top: 10,
    //    bottom: 80
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 80, right: 90, top: 10, bottom: 80 },
        commonPaneSettings: {
            border: { visible: true }
        }
    });
    chart._render({
        force: true,
        drawTitle: false,
        drawLegend: false,
        adjustAxes: false,
        animate: false
    });


    assert.ok(chart.panes);
    assert.ok(chart._panesBorderGroup.clear.called);
    assert.ok(chart._renderer.g.callCount);
    var bordersGroups = [],
        attrCall;
    for(var i = 0; i < chart._renderer.g.callCount; i++) {
        attrCall = chart._renderer.g.getCall(i).returnValue.stub("attr");
        if(attrCall.called && attrCall.firstCall.args[0]["class"] === "dxc-border") {
            bordersGroups.push(chart._renderer.g.getCall(i).returnValue);
        }
    }

    assert.equal(bordersGroups.length, 1);

});

QUnit.test("Create border, custom attributes", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 80,
    //    right: 90,
    //    top: 10,
    //    bottom: 80
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 80, right: 90, top: 10, bottom: 80 },
        commonPaneSettings: {
            border: {
                visible: true,
                dashStyle: "dash"
            }
        }
    });

    assert.ok(chart.panes);
    assert.equal(chart.panes.length, 1);
    assert.equal(chart._renderer.path.callCount, 1);

    checkSegmentRectCommon(assert, chart, 0, 80, 10, 630, 710, "none", "dash", undefined, undefined, undefined, { top: true, bottom: true, left: true, right: true });
});

QUnit.test("Create border, bottom = false", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 80,
    //    right: 90,
    //    top: 10,
    //    bottom: 80
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 80, right: 90, top: 10, bottom: 80 },
        commonPaneSettings: {
            border: {
                visible: true,
                bottom: false
            }
        }
    });

    assert.ok(chart.panes);
    assert.equal(chart.panes.length, 1);
    assert.equal(chart._renderer.path.callCount, 1);
    checkSegmentRectCommon(assert, chart, 0, 80, 10, 630, 710, "none", "solid", undefined, undefined, undefined, { top: true, bottom: false, left: true, right: true });
});

QUnit.test("Create two borders, with different attributes", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 80,
    //    right: 90,
    //    top: 10,
    //    bottom: 80
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 80, right: 90, top: 10, bottom: 80 },
        commonPaneSettings: {
            defaultPane: "topPane",
            border: {
                visible: true,
                width: 10,
                color: "red"
            }
        },
        panes: [{
            name: "topPane",
            border: {
                color: "green",
                width: 5,
                opacity: 0.4
            }
        }, {
            name: "bottomPane",
            border: {
                color: "blue",
                width: 7,
                opacity: 0.1
            }
        }]
    });

    assert.ok(chart.panes);
    assert.equal(chart.panes.length, 2);
    assert.equal(chart._renderer.path.callCount, 2);

    checkSegmentRectCommon(assert, chart, 0, 80, 10, 630, 710, "none", "solid", "green", 5, 0.4, { top: true, bottom: true, left: true, right: true });
    checkSegmentRectCommon(assert, chart, 1, 80, 10, 630, 710, "none", "solid", "blue", 7, 0.1, { top: true, bottom: true, left: true, right: true });
});

QUnit.test("Negative Panes border width and height", function(assert) {
    //var chartOptions = {
    //    width: 800,
    //    height: 800,
    //    left: 600,
    //    right: 300,
    //    top: 500,
    //    bottom: 400
    //};

    var chart = this.createChart({
        size: { width: 800, height: 800 },
        margin: { left: 600, right: 300, top: 500, bottom: 400 },
        commonPaneSettings: {
            border: { visible: true }
        }
    });

    assert.ok(chart.panes);
    assert.equal(chart.panes.length, 1);
    //assert.equal(chart._renderer.path.callCount, 1);
    //checkSegmentRectCommon(assert, chart, 0, 600, 500, 0, 0, "none", "solid", undefined, undefined, undefined, { top: true, bottom: true, left: true, right: true });
    assert.strictEqual(chart._renderer.stub("path").lastCall, null);
});

QUnit.module("Prepare shared tooltip", $.extend({}, commons.environment, {
    beforeEach: function() {
        commons.environment.beforeEach.call(this);
        this.clock = sinon.useFakeTimers();
    },
    afterEach: function() {
        this.clock.restore();
        commons.environment.afterEach.call(this);
    }
}));

QUnit.test("stack is null", function(assert) {
    assert.expect(2 + 2 * 3 * 5);
    //arrange
    var point1 = new MockPoint({ argument: "1", val: 1 }),
        point2 = new MockPoint({ argument: "2", val: 2 }),
        point3 = new MockPoint({ argument: "3", val: 3 }),
        point4 = new MockPoint({ argument: "1", val: 3 }),
        point5 = new MockPoint({ argument: "2", val: 5 }),
        point6 = new MockPoint({ argument: "3", val: 7 }),
        stubSeries1 = new MockSeries({ points: [point1, point2, point3], stack: null }),
        stubSeries2 = new MockSeries({ points: [point4, point5, point6], stack: null });
    seriesMockData.series.push(stubSeries1, stubSeries2);
    //act
    var chart = this.createChart({
        tooltip: { shared: true },
        series: [{
            name: "name1",
            type: "line"
        }, {
            name: "name2",
            type: "line"
        }]
    });

    //assert
    var checkStackPoints = function(series, points) {
        $.each(series.getPoints(), function(i, point) {
            assert.equal(point.stackPoints.length, 2);
            assert.equal(point.stackPoints[0].argument, points[0 + i].argument);
            assert.equal(point.stackPoints[0].stackName, null);
            assert.equal(point.stackPoints[1].argument, points[3 + i].argument);
            assert.equal(point.stackPoints[1].stackName, null);
        });
    };

    assert.ok(chart.series, "dxChart has series");
    assert.equal(chart.series.length, 2, "There should be single series");

    checkStackPoints(chart.series[0], [point1, point2, point3, point4, point5, point6]);
    checkStackPoints(chart.series[1], [point1, point2, point3, point4, point5, point6]);
});

QUnit.test("different stack", function(assert) {
    assert.expect(2 + 2 * 3 * 4 + 3 * 2);
    //arrange
    var point1 = new MockPoint({ argument: "1", val: 1 }),
        point2 = new MockPoint({ argument: "2", val: 2 }),
        point3 = new MockPoint({ argument: "3", val: 3 }),
        point4 = new MockPoint({ argument: "1", val: 4 }),
        point5 = new MockPoint({ argument: "2", val: 5 }),
        point6 = new MockPoint({ argument: "3", val: 6 }),
        point7 = new MockPoint({ argument: "1", val: 7 }),
        point8 = new MockPoint({ argument: "2", val: 8 }),
        point9 = new MockPoint({ argument: "3", val: 9 }),
        stubSeries1 = new MockSeries({ points: [point1, point2, point3], stack: null }),
        stubSeries2 = new MockSeries({ points: [point4, point5, point6], stack: "a" }),
        stubSeries3 = new MockSeries({ points: [point7, point8, point9], stack: "b" });
    seriesMockData.series.push(stubSeries1, stubSeries2, stubSeries3);
    //act
    var chart = this.createChart({
        tooltip: { shared: true },
        series: [{ name: "name1", type: "line" }, { name: "name2", type: "line" }, { name: "name3", type: "line" }]
    });

    //assert
    var checkStackPoints = function(series, points, stackName) {
        $.each(series.getPoints(), function(i, point) {
            assert.equal(point.stackPoints[0].argument, points[0 + i].argument);
            assert.equal(point.stackPoints[0].stackName, null);
            if(stackName === "a" || stackName === null) {
                assert.equal(point.stackPoints[1].argument, points[3 + i].argument);
                assert.equal(point.stackPoints[1].stackName, "a");
            }
            if(stackName === "b" || stackName === null) {
                var num = stackName === "b" ? 1 : 2;
                assert.equal(point.stackPoints[num].argument, points[6 + i].argument);
                assert.equal(point.stackPoints[num].stackName, "b");
            }
        });
    };

    assert.ok(chart.series, "dxChart has series");
    assert.equal(chart.series.length, 3, "There should be single series");

    checkStackPoints(chart.series[0], [point1, point2, point3, point4, point5, point6, point7, point8, point9]);
    checkStackPoints(chart.series[1], [point1, point2, point3, point4, point5, point6, point7, point8, point9], "a");
    checkStackPoints(chart.series[2], [point1, point2, point3, point4, point5, point6, point7, point8, point9], "b");
});

QUnit.test("different stack", function(assert) {
    assert.expect(2 + 2 * 3 * 4 + 3 * 2);
    //arrange
    var point1 = new MockPoint({ argument: "1", val: 1 }),
        point2 = new MockPoint({ argument: "2", val: 2 }),
        point3 = new MockPoint({ argument: "3", val: 3 }),
        point4 = new MockPoint({ argument: "1", val: 4 }),
        point5 = new MockPoint({ argument: "2", val: 5 }),
        point6 = new MockPoint({ argument: "3", val: 6 }),
        point7 = new MockPoint({ argument: "1", val: 7 }),
        point8 = new MockPoint({ argument: "2", val: 8 }),
        point9 = new MockPoint({ argument: "3", val: 9 }),
        stubSeries1 = new MockSeries({ points: [point1, point2, point3], stack: "a" }),
        stubSeries2 = new MockSeries({ points: [point4, point5, point6], stack: null }),
        stubSeries3 = new MockSeries({ points: [point7, point8, point9], stack: "b" });
    seriesMockData.series.push(stubSeries1, stubSeries2, stubSeries3);
    //act
    var chart = this.createChart({
        tooltip: { shared: true },
        series: [{ name: "name1", type: "line" }, { name: "name2", type: "line" }, { name: "name3", type: "line" }]
    });

    //assert
    var checkStackPoints = function(series, points, stackName) {
        var num;
        $.each(series.getPoints(), function(i, point) {
            if(stackName === "a" || stackName === null) {
                assert.equal(point.stackPoints[0].argument, points[0 + i].argument);
                assert.equal(point.stackPoints[0].stackName, "a");
            }
            num = stackName === "b" ? 0 : 1;
            assert.equal(point.stackPoints[num].argument, points[3 + i].argument);
            assert.equal(point.stackPoints[num].stackName, null);
            if(stackName === "b" || stackName === null) {
                num = stackName === "b" ? 1 : 2;
                assert.equal(point.stackPoints[num].argument, points[6 + i].argument);
                assert.equal(point.stackPoints[num].stackName, "b");
            }
        });
    };

    assert.ok(chart.series, "dxChart has series");
    assert.equal(chart.series.length, 3, "There should be single series");

    checkStackPoints(chart.series[0], [point1, point2, point3, point4, point5, point6, point7, point8, point9], "a");
    checkStackPoints(chart.series[1], [point1, point2, point3, point4, point5, point6, point7, point8, point9]);
    checkStackPoints(chart.series[2], [point1, point2, point3, point4, point5, point6, point7, point8, point9], "b");
});

QUnit.test("update shared tooltip with not shared", function(assert) {
    //arrange
    var point1 = new MockPoint({ argument: "1", val: 1 }),
        point2 = new MockPoint({ argument: "2", val: 2 }),
        point3 = new MockPoint({ argument: "3", val: 3 }),
        point4 = new MockPoint({ argument: "1", val: 3 }),
        point5 = new MockPoint({ argument: "2", val: 5 }),
        point6 = new MockPoint({ argument: "3", val: 7 }),
        stubSeries1 = new MockSeries({ points: [point1, point2, point3], stack: null }),
        stubSeries2 = new MockSeries({ points: [point4, point5, point6], stack: null });
    seriesMockData.series.push(stubSeries1, stubSeries2);
    //act
    var chart = this.createChart({
        dataSource: [{}],
        tooltip: { shared: true },
        series: [{
            name: "name1",
            type: "line"
        }, {
            name: "name2",
            type: "line"
        }]
    });
    this.themeManager.getOptions.withArgs("tooltip").returns({ shared: false, enabled: true, font: {} });
    chart.option({ tooltip: { shared: false } });

    //assert
    var checkStackPoints = function(series) {
        $.each(series.getPoints(), function(i, point) {
            assert.equal(point.stackPoints, null);
            assert.equal(point.stackName, null);
        });
    };

    assert.ok(chart.series, "dxChart has series");
    assert.equal(chart.series.length, 2, "There should be single series");

    checkStackPoints(chart.series[0]);
    checkStackPoints(chart.series[1]);
});

QUnit.module("check free canvas", commons.environment);

QUnit.test("require canvas is not defined", function(assert) {
    var chart = this.createChart({});

    chart._doRender({ force: true });

    assert.equal(chart._argumentAxes[0].draw.callCount, 2);
    assert.equal(chart._valueAxes[0].draw.callCount, 2);
});

QUnit.module("CrosshairCursor", $.extend({}, commons.environment, {
    createChartWithCrosshair: function(crosshairOptions, panes, rotated) {
        return this.createChart({
            size: { width: 800, height: 800 },
            margin: { left: 80, right: 90, top: 10, bottom: 80 },
            panes: panes,
            rotated: rotated,
            crosshair: $.extend(true, {
                enabled: true,
                width: 1,
                color: "yellow",
                opacity: 1,
                dashStyle: "solid",
                horizontalLine: {
                    visible: true
                },
                verticalLine: {
                    visible: true
                }
            }, crosshairOptions)
        });
    }
}));

QUnit.test("Create CrosshairCursor, not rotated", function(assert) {
    var chart = this.createChartWithCrosshair();

    assert.ok(chart._crosshair);
    assert.ok(chart._crosshair.render.called);

    assert.equal(crosshairModule.Crosshair.args[0][0], chart._renderer);
    assert.deepEqual(crosshairModule.Crosshair.args[0][1], chart._options.crosshair);
    assert.deepEqual(crosshairModule.Crosshair.args[0][2].canvas, chart._canvas, "canvas");
    assert.deepEqual(crosshairModule.Crosshair.args[0][2].axes, [chart._argumentAxes, chart._valueAxes]);
    assert.deepEqual(crosshairModule.Crosshair.args[0][2].panes, []);
    assert.deepEqual(crosshairModule.Crosshair.args[0][3], chart._crosshairCursorGroup);
});

QUnit.test("Create crosshair with two panes", function(assert) {
    var panes = [{
            name: "top"
        }, {
            name: "bottom"
        }],
        chart = this.createChartWithCrosshair({}, panes);

    assert.deepEqual(crosshairModule.Crosshair.args[0][2].axes[0], [chart._argumentAxes[1]]);
});

QUnit.test("Create crosshair with two panes, rotated", function(assert) {
    var panes = [{
            name: "top"
        }, {
            name: "bottom"
        }],
        chart = this.createChartWithCrosshair({}, panes, true);

    assert.deepEqual(crosshairModule.Crosshair.args[0][2].axes[1], [chart._argumentAxes[0]]);
});

QUnit.test("Create CrosshairCursor, rotated", function(assert) {
    var chart = this.createChartWithCrosshair({}, {}, true);

    assert.ok(chart._crosshair);
    assert.ok(chart._crosshair.render.called);
    assert.deepEqual(crosshairModule.Crosshair.lastCall.args, [chart._renderer, chart._options.crosshair, { canvas: chart._canvas, axes: [chart._valueAxes, chart._argumentAxes], panes: [] }, chart._crosshairCursorGroup]);
});

QUnit.test("create crosshair, border of panes is visible", function(assert) {
    var chart = this.createChartWithCrosshair({}, { border: { visible: true } });

    assert.ok(chart._crosshair);
    assert.ok(chart._crosshair.render.called);
    assert.deepEqual(crosshairModule.Crosshair.lastCall.args, [
        chart._renderer, chart._options.crosshair, {
            canvas: chart._canvas,
            axes: [chart._argumentAxes, chart._valueAxes],
            panes: [{
                coords: {
                    bottom: 720,
                    height: 710,
                    left: 80,
                    right: 710,
                    top: 10,
                    width: 630
                },
                clipRect: chart._panesClipRects.fixed[0]
            }]
        }, chart._crosshairCursorGroup
    ]);
});

QUnit.test("Create CrosshairCursor, not enabled", function(assert) {
    var chart = this.createChartWithCrosshair({ enabled: false });
    assert.ok(!chart._crosshair);
});

QUnit.test("Update Crosshair", function(assert) {
    var chart = this.createChartWithCrosshair({ enabled: true });

    chart.option({ crosshair: { verticalLine: { visible: true } } });

    assert.ok(chart._crosshair.update.called);
    assert.deepEqual(chart._crosshair.update.lastCall.args, [chart._options.crosshair, { canvas: chart._canvas, axes: [chart._argumentAxes, chart._valueAxes], panes: [] }]);
    assert.ok(chart._crosshair.render.called);
});

QUnit.test("crosshair disabling", function(assert) {
    var chart = this.createChartWithCrosshair({ enabled: true });

    this.themeManager.getOptions.withArgs("crosshair").returns({ enabled: false });
    chart.option({ crosshair: { enabled: false } });

    assert.strictEqual(trackerModule.ChartTracker.lastCall.returnValue.update.lastCall.args[0].crosshair, null);
});

QUnit.module("pass options to seriesFamily", commons.environment);

QUnit.test("pass to ctor", function(assert) {
    var stubSeries1 = new MockSeries({ points: [new MockPoint({ argument: "1", val: 1 })] }),
        stubSeries2 = new MockSeries({ points: [new MockPoint({ argument: "2", val: 2 })] });

    seriesMockData.series.push(stubSeries1, stubSeries2);


    this.createChart({
        equalBarWidth: "equalBarWidth-option",
        barWidth: "barWidth-option",
        rotated: "rotated-option",
        series: [{ name: "name1", type: "line" }, { name: "name2", type: "bar" }],
        maxBubbleSize: "someMaxBubbleSize",
        minBubbleSize: "someMinBubbleSize",
        negativesAsZeroes: "someNegativesAsZeroes"
    });

    assert.deepEqual(this.createSeriesFamily.args[0][0], {
        equalBarWidth: "equalBarWidth-option",
        maxBubbleSize: "someMaxBubbleSize",
        minBubbleSize: "someMinBubbleSize",
        type: "line",
        pane: "default",
        rotated: "rotated-option",
        barWidth: "barWidth-option",
        negativesAsZeroes: "someNegativesAsZeroes"
    });
});

QUnit.test("Negatives as zeroes. misspelling case", function(assert) {
    var stubSeries1 = new MockSeries({ points: [new MockPoint({ argument: "1", val: 1 })] }),
        stubSeries2 = new MockSeries({ points: [new MockPoint({ argument: "2", val: 2 })] });

    seriesMockData.series.push(stubSeries1, stubSeries2);


    this.createChart({
        series: [{ name: "name1", type: "line" }, { name: "name2", type: "bar" }],
        negativesAsZeroes: undefined,
        negativesAsZeros: "misspelled-value"
    });

    assert.equal(this.createSeriesFamily.args[0][0].negativesAsZeroes, "misspelled-value");
});

QUnit.test("Negatives as zeroes. misspelling case is ignored when correct option passed", function(assert) {
    var stubSeries1 = new MockSeries({ points: [new MockPoint({ argument: "1", val: 1 })] }),
        stubSeries2 = new MockSeries({ points: [new MockPoint({ argument: "2", val: 2 })] });

    seriesMockData.series.push(stubSeries1, stubSeries2);


    this.createChart({
        series: [{ name: "name1", type: "line" }, { name: "name2", type: "bar" }],
        negativesAsZeroes: "correct-value",
        negativesAsZeros: "misspelled-value"
    });

    assert.equal(this.createSeriesFamily.args[0][0].negativesAsZeroes, "correct-value");
});
