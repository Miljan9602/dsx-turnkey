"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginMethod = exports.Authenticator = exports.PayloadEncoding = exports.HashFunction = void 0;
var HashFunction;
(function (HashFunction) {
    HashFunction["NoOp"] = "HASH_FUNCTION_NO_OP";
    HashFunction["SHA256"] = "HASH_FUNCTION_SHA256";
    HashFunction["KECCAK256"] = "HASH_FUNCTION_KECCAK256";
    HashFunction["NotApplicable"] = "HASH_FUNCTION_NOT_APPLICABLE";
})(HashFunction || (exports.HashFunction = HashFunction = {}));
var PayloadEncoding;
(function (PayloadEncoding) {
    PayloadEncoding["Hexadecimal"] = "PAYLOAD_ENCODING_HEXADECIMAL";
    PayloadEncoding["TextUTF8"] = "PAYLOAD_ENCODING_TEXT_UTF8";
})(PayloadEncoding || (exports.PayloadEncoding = PayloadEncoding = {}));
var Authenticator;
(function (Authenticator) {
    Authenticator["APIKey"] = "API_KEY";
    Authenticator["Passkey"] = "PASSKEY";
})(Authenticator || (exports.Authenticator = Authenticator = {}));
var LoginMethod;
(function (LoginMethod) {
    LoginMethod["Passkey"] = "PASSKEY";
    LoginMethod["Email"] = "EMAIL";
    LoginMethod["Phone"] = "PHONE";
    LoginMethod["OAuth"] = "OAUTH";
})(LoginMethod || (exports.LoginMethod = LoginMethod = {}));
