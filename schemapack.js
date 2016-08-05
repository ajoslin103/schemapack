// MIT License
// Source: https://github.com/phretaddin/schemapack

'use strict';

var Buffer = require('buffer').Buffer;
var strEnc = 'utf8';
var aliasTypes = {};
var sortSchema = true;

function addTypeAlias(newTypeName, underlyingType) {
  var everyType = Object.keys(readTypeDictStr);

  if (everyType.indexOf(underlyingType) < 0) { throw new TypeError("Underlying type does not exist. Typo?"); }
  else { aliasTypes[newTypeName] = underlyingType; }
}

function getDataType(val) {
  var everyType = Object.keys(readTypeDictStr);
  var dataType = val.trim().toLowerCase();
  if (aliasTypes.hasOwnProperty(dataType)) { dataType = aliasTypes[dataType]; }
  if (everyType.indexOf(dataType) === -1) { throw new TypeError("Invalid data type for schema: " + val + " -> " + dataType); }
  return dataType;
}

function setSchemaSorting(schemaSorting) {
	sortSchema = schemaSorting;
}

function setStringEncoding(stringEncoding) {
  var requested = stringEncoding.trim().toLowerCase();
  var available = [ 'ascii', 'utf8', 'utf16le', 'ucs2', 'base64', 'binary', 'hex' ];
  if (available.indexOf(requested) > -1) { strEnc = requested; }
  else { throw new TypeError("String encoding not available"); }
}

function writeVarUInt(value, wBuffer) {
  while (value > 127) {
    wBuffer[bag.byteOffset++] = (value & 127) | 128;
    value >>= 7;
  }
  wBuffer[bag.byteOffset++] = value & 127;
}

function writeVarInt(value, wBuffer) {
  writeVarUInt((value << 1) ^ (value >> 31), wBuffer);
}

function readVarUInt(buffer) {
  var val = 0, i = 0, b;

  do {
    b = buffer[bag.byteOffset++];
    val |= (b & 127) << (7 * i);
    i++;
  } while (b & 128);

  return val;
}

function readVarInt(buffer) {
  var val = readVarUInt(buffer);
  return (val >>> 1) ^ -(val & 1);
}

function writeString(val, wBuffer) {
  var len = Buffer.byteLength(val || '', strEnc);
  writeVarUInt(len, wBuffer);
  bag.byteOffset += wBuffer.write(val || '', bag.byteOffset, len, strEnc);
}

function readString(buffer) {
  var len = readVarUInt(buffer);
  var str = buffer.toString(strEnc, bag.byteOffset, bag.byteOffset + len);
  bag.byteOffset += len;
  return str;
}

var readTypeDictStr = {
  "boolean": "!!buffer.readUInt8(bag.byteOffset, true); bag.byteOffset += 1;",
  "int8": "buffer.readInt8(bag.byteOffset, true); bag.byteOffset += 1;",
  "uint8": "buffer.readUInt8(bag.byteOffset, true); bag.byteOffset += 1;",
  "int16": "buffer.readInt16BE(bag.byteOffset, true); bag.byteOffset += 2;",
  "uint16": "buffer.readUInt16BE(bag.byteOffset, true); bag.byteOffset += 2;",
  "int32": "buffer.readInt32BE(bag.byteOffset, true); bag.byteOffset += 4;",
  "uint32": "buffer.readUInt32BE(bag.byteOffset, true); bag.byteOffset += 4;",
  "float32": "buffer.readFloatBE(bag.byteOffset, true); bag.byteOffset += 4;",
  "float64": "buffer.readDoubleBE(bag.byteOffset, true); bag.byteOffset += 8;",
  "string": "bag.readString(buffer);",
  "varuint": "bag.readVarUInt(buffer);",
  "varint": "bag.readVarInt(buffer);"
};

function getWriteTypeDictStr(dataType, valStr) {
  switch (dataType) {
    case "boolean": return "bag.byteOffset = wBuffer.writeUInt8(" + valStr + " ? 1 : 0, bag.byteOffset, true);";
    case "int8": return "bag.byteOffset = wBuffer.writeInt8(" + valStr + ", bag.byteOffset, true);";
    case "uint8": return "bag.byteOffset = wBuffer.writeUInt8(" + valStr + ", bag.byteOffset, true);";
    case "int16": return "bag.byteOffset = wBuffer.writeInt16BE(" + valStr + ", bag.byteOffset, true);";
    case "uint16": return "bag.byteOffset = wBuffer.writeUInt16BE(" + valStr + ", bag.byteOffset, true);";
    case "int32": return "bag.byteOffset = wBuffer.writeInt32BE(" + valStr + ", bag.byteOffset, true);";
    case "uint32": return "bag.byteOffset = wBuffer.writeUInt32BE(" + valStr + ", bag.byteOffset, true);";
    case "float32": return "bag.byteOffset = wBuffer.writeFloatBE(" + valStr + ", bag.byteOffset, true);";
    case "float64": return "bag.byteOffset = wBuffer.writeDoubleBE(" + valStr + ", bag.byteOffset, true);";
    case "string": return "bag.writeString(" + valStr + ", wBuffer);";
    case "varuint": return "bag.writeVarUInt(" + valStr + ", wBuffer);";
    case "varint": return "bag.writeVarInt(" + valStr + ", wBuffer);";
  }
}

var constantByteCounts = { "boolean": 1, "int8": 1, "uint8": 1, "int16": 2, "uint16": 2, "int32": 4, "uint32": 4, "float32": 4, "float64": 8 };

var dynamicByteCounts = {
  "string": function(val) { var len = Buffer.byteLength(val, strEnc); return getVarUIntByteLength(len) + len; },
  "varuint": function(val) { return getVarUIntByteLength(val); },
  "varint": function(val) { return getVarIntByteLength(val); }
};

function getVarUIntByteLength(val) {
  if (val <= 0) { return 1; }
  return Math.floor(Math.log(val) / Math.log(128)) + 1;
}

function getVarIntByteLength(value) {
  return getVarUIntByteLength((value << 1) ^ (value >> 31));
}

var allocUnsafe = Buffer.allocUnsafe ? function(n) {
  return Buffer.allocUnsafe(n);
} : function(n) {
  return new Buffer(n);
};

var bufferFrom = Buffer.from ? function(buf) {
  return Buffer.from(buf);
} : function(buf) {
  return new Buffer(buf);
};

var bag = {};
bag.allocUnsafe = allocUnsafe;
bag.getVarUIntByteLength = getVarUIntByteLength;
bag.dynamicByteCounts = dynamicByteCounts;
bag.readVarUInt = readVarUInt;
bag.readVarInt = readVarInt;
bag.writeVarUInt = writeVarUInt;
bag.writeVarInt = writeVarInt;
bag.readString = readString;
bag.writeString = writeString;
bag.byteOffset = 0;

function processArrayEnd(val, id, commands, stackLen, arrLenStr) {
  var repID = stackLen <= 1 ? id : (id - 1) + "xn";
  var outerBound = arrLenStr === undefined ? "ref" + repID + ".length" : arrLenStr;
  var jStr = "j" + id;

  return "for (var " + jStr + "=" + (val.length - 1) + ";" + jStr + "<" + outerBound + ";" + jStr + "++) { " + commands + "}";
}

function getArrayLengthByteCount(id) {
  return "byteC+=bag.getVarUIntByteLength(ref" + id + ".length);";
}

function encodeArrayLength(id) {
  return "bag.writeVarUInt(ref" + id + ".length,wBuffer);";
}

function decodeArrayLength(arrLenStr) {
  return "var " + arrLenStr + "=bag.readVarUInt(buffer);";
}

function declareDecodeRef(id, parentID, prop, container) {
  return "var ref" + id + "=" + container + "; ref" + parentID + "[" + prop + "]=ref" + id + ";";
}

function declareEncodeRef(id, parentID, prop) {
  return "var ref" + id + "=ref" + parentID + "[" + prop + "];";
}

function declareRepeatRefs(repItem, id, prop, container, repEncArrStack, repDecArrStack, repByteCountStack) {
  var repID = getXN(repEncArrStack, id);
  var index = repItem ? "j" + id : prop;

  repEncArrStack[repEncArrStack.length - 1] += declareEncodeRef(id + "xn", repID, index);
  repDecArrStack[repDecArrStack.length - 1] += declareDecodeRef(id + "xn", repID, index, container);
  repByteCountStack[repByteCountStack.length - 1] += declareEncodeRef(id + "xn", repID, index);;
}

function encodeValue(dataType, id, prop) {
  return getWriteTypeDictStr(dataType, "ref" + id + prop);
}

function decodeValue(dataType, id, prop) {
  return "ref" + id + prop + "=" + readTypeDictStr[dataType];
}

function encodeByteCount(dataType, id, prop) {
  var isConstant = constantByteCounts.hasOwnProperty(dataType);

  if (isConstant) { return "byteC+=" + constantByteCounts[dataType] + ";"; }
  else { return "byteC+=bag.dynamicByteCounts['" + dataType + "'](ref" + id + prop + ");"; }
}

function getXN(aStack, id) {
  return aStack.length <= 2 && aStack[aStack.length - 1].length <= 0 ? id : (id - 1) + "xn";
}

function getCompiledSchema(schema) {
  var strEncodeFunction = "bag.byteOffset=0;";
  var strDecodeFunction = "var ref1={}; bag.byteOffset=0;";
  var strByteCount = "";
  var strEncodeRefDecs = "var ref1=json;";
  var incID = 0;

  var repEncArrStack = [""];
  var repDecArrStack = [""];
  var repByteCountStack = [""];
  var tmpRepEncArr = "";
  var tmpRepDecArr = "";
  var tmpRepByteCount = "";

  var isSingleItem = typeof schema === "string";
  var isArray = schema.constructor === Array;

  if (isSingleItem || isArray) { schema = { 'a': schema }; }

  function compileSchema(json, inArray) {
    incID++;
    var keys = Object.keys(json);
    if (sortSchema) {
		keys.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
	}

    var saveID = incID;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = json[key];

      if (inArray) { key = +key; }

      var prop = typeof key === "number" ? key : "'" + key + "'";
      var container = val.constructor === Array ? "[]" : "{}";
      var isRepArrItem = inArray && i >= keys.length - 1;

      if (isRepArrItem) {
        repEncArrStack.push("");
        repDecArrStack.push("");
        repByteCountStack.push("");
      }

      if (val.constructor === Array) {
        var newID = incID + 1;
        var repID = repEncArrStack.length <= 1 ? newID : saveID + "xn";
        var arrLenStr = "arrLen" + incID;

        strEncodeRefDecs += declareEncodeRef(newID, saveID, prop);
        strDecodeFunction += declareDecodeRef(newID, saveID, prop, "[]");

        var encArrayLength = encodeArrayLength(repID);
        var decArrayLength = decodeArrayLength(arrLenStr);
        var byteArrayLength = getArrayLengthByteCount(repID);

        declareRepeatRefs(isRepArrItem, saveID, prop, container, repEncArrStack, repDecArrStack, repByteCountStack);

        compileSchema(val, true);

        tmpRepEncArr = encArrayLength + processArrayEnd(val, newID, repEncArrStack.pop() + tmpRepEncArr, repEncArrStack.length);
        tmpRepDecArr = decArrayLength + processArrayEnd(val, newID, repDecArrStack.pop() + tmpRepDecArr, repEncArrStack.length, arrLenStr);
        tmpRepByteCount = byteArrayLength + processArrayEnd(val, newID, repByteCountStack.pop() + tmpRepByteCount, repEncArrStack.length);

        if (repEncArrStack.length === 1) {
          strEncodeFunction += tmpRepEncArr; tmpRepEncArr = "";
          strDecodeFunction += tmpRepDecArr; tmpRepDecArr = "";
          strByteCount += tmpRepByteCount; tmpRepByteCount = "";
        }
      } else if (typeof val === 'object') {
        var newID = incID + 1;

        strEncodeRefDecs += declareEncodeRef(newID, saveID, prop);
        strDecodeFunction += declareDecodeRef(newID, saveID, prop, "{}");
        declareRepeatRefs(isRepArrItem, saveID, prop, container, repEncArrStack, repDecArrStack, repByteCountStack);

        compileSchema(val, false);
      } else {
        var index = inArray ? "" : "[" + prop + "]";
        var dataType = getDataType(val);
        json[key] = dataType;

        var repID = getXN(repEncArrStack, saveID);
        if (inArray) { repID += isRepArrItem ? "[j" + saveID + "]" : "[" + i + "]"; }

        repEncArrStack[repEncArrStack.length - 1] += encodeValue(dataType, repID, index);
        repDecArrStack[repDecArrStack.length - 1] += decodeValue(dataType, repID, index);
        repByteCountStack[repByteCountStack.length - 1] += encodeByteCount(dataType, repID, index);

        if (isRepArrItem) { continue; }

        var uniqID = inArray ? saveID + "[" + i + "]" : saveID;
        strEncodeFunction += encodeValue(dataType, uniqID, index);
        strDecodeFunction += decodeValue(dataType, uniqID, index);
        strByteCount += encodeByteCount(dataType, uniqID, index);
      }
    }
  }

  compileSchema(schema);

  strByteCount = "var byteC=0;".concat(strByteCount, "var wBuffer=bag.allocUnsafe(byteC);")
  strEncodeFunction = strEncodeRefDecs.concat(strByteCount, strEncodeFunction, "return wBuffer;");
  strDecodeFunction = strDecodeFunction.concat("return ref" + (isSingleItem ? "1['a'];" : isArray ? "2;" : "1;"));

  var compiledEncode = new Function('json', 'bag', strEncodeFunction);
  var compiledDecode = new Function('buffer', 'bag', strDecodeFunction);

  return [ compiledEncode, compiledDecode ];
}

function build(schema) {
  var builtSchema = getCompiledSchema(schema);

  var compiledEncode = builtSchema[0];
  var compiledDecode = builtSchema[1];

  return {
    "encode": function(json) {
      var itemWrapper = typeof json === "object" && json.constructor !== Array ? json : { "a": json };
      return compiledEncode(itemWrapper, bag);
    },
    "decode": function(buffer) {
      var bufferWrapper = buffer instanceof ArrayBuffer ? bufferFrom(buffer) : buffer;
      return compiledDecode(bufferWrapper, bag);
    }
  }
}

addTypeAlias('bool', 'boolean');

module.exports = exports = {
  "build": build,
  "addTypeAlias": addTypeAlias,
  "setStringEncoding": setStringEncoding,
  "setSchemaSorting": setSchemaSorting
};
