
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith =
        function (str){
            return this.substring(0, str.length) === str;
        };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith =
        function (str){
            return this.substring(this.length-str.length, this.length) === str;
        };
}

if (typeof String.prototype.contains != 'function') {
    String.prototype.contains =
        function (str){
            return this.indexOf(str) >= 0;
        };
}

if (typeof String.prototype.isNumber != 'function') {
    String.prototype.isNumber =
        function (){
            return /^\d+$/.test( this ); 
        };
}

if (typeof String.prototype.toHTMLString != 'function') {
    String.prototype.toHTMLString =
        function (){
            var result = '';

            for (var i=0; i<this.length; i++)
            {
                switch ( this.charCodeAt(i) )
                {
                    case 10:    result += '<br>';   break;          
                    case 32:    result += '&nbsp;'; break;
                    default:    result += this.charAt(i);
                }
            }

            return result;

        };
}
