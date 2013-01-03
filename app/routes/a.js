
var     assert  = require('assert')
    ,   _       = require('underscore')
    ;

require('./string-extension');

var a = exports;

a.assert_f = 
	function( value, name_opz )
    {
        assert( value != undefined, ( name_opz ? name_opz : 'callback function' ) + ' is undefined' );
        assert( (typeof value == 'function'), 'expected function, given: ' + value );

        return value;
    };

function _assert_valid_string(value, name)
{
    assert( value != undefined,         name + ' is undefined' );
    assert( typeof value == 'string',   name + ' is not string is:' + typeof value );
    assert( value.length > 0,           'Not a valid ' + name + ', len == 0' );
}
    
a.assert_http_url = 
    function(value)
    {
        _assert_valid_string(value, 'url');
        assert( value.startsWith('http') != undefined, 'url doesnt start with http');
        return value;
    };

a.assert_fbId =
    function(value)
    {
        _assert_valid_string(value, 'fbId');
        assert( value.isNumber(),   'Not a valid Facebook Id' );
        
        return value;        
    };

a.assert_def =
    function(value, name_opz)
    {
        assert( value != undefined, ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        return value;
    };

a.assert_null =
    function(value, name_opz)
    {
        assert( value == null, ( name_opz ? name_opz : 'value' ) + ' is expected to be null');
    };

a.assert_obj =
    function(value, name_opz)
    {
        assert( value != undefined, ( name_opz ? name_opz : 'object' ) + ' is undefined' );
        assert( _.isObject(value),  ( name_opz ? name_opz : 'object' ) + ' expected' );
        return value;
    };

a.assert_uid = 
    function(value)
    {
        assert( value != undefined,         'uid is undefined' );
        assert( typeof value == 'string',   'uid is not a string' );
        assert( value.length > 0,           'invalid uid, len == 0' );
        assert ( value.isNumber() || ( value[0] == 'T'), 'uid is not valid' );
        
        return value;
    };

a.assert_array = 
    function(value, name_opz)
    {
        assert( value != undefined,   ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        assert( Array.isArray(value), ( name_opz ? name_opz : 'value' ) + ' is not a array' );
        return value;
    };

a.assert_string =
    function(value, name_opz)
    {
        assert( value != undefined,         ( name_opz ? name_opz : 'value' ) + ' is undefined' );
        assert( typeof value == 'string',   ( name_opz ? name_opz : 'value' ) + ' is not a string' );
        return value;
    };


