<?
// common code to include when access to the TM database is needed
// in PHP code

// this should point to /home/www/courses/metal/lib/tm.conf on noreaster
$tmconffile = fopen($_SERVER['DOCUMENT_ROOT']."/metal/lib/tm.conf", "r");
$tmdbname = chop(fgets($tmconffile));
$tmdbuser = chop(fgets($tmconffile));
$tmdbpasswd = chop(fgets($tmconffile));
$tmdbhost = chop(fgets($tmconffile));
// HERE maps API id and code
$tmhereid = chop(fgets($tmconffile));
$tmherecode = chop(fgets($tmconffile));
fclose($tmconffile);

// make the connection
//echo "<!-- mysqli connecting to database ".$tmdbname." on ".$tmdbhost." -->\n";
mysqli_report(MYSQLI_REPORT_STRICT);
try {
    $tmdb = new mysqli($tmdbhost, $tmdbuser, $tmdbpasswd, $tmdbname);
}
catch ( Exception $e ) {
   echo "<h1 style='color: red'>Failed to connect to database ".$tmdbname." on ".$tmdbhost." Please try again later.</h1>";
   exit;
}
?>
