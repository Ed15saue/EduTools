<?
// read information about graphs from our DB
$jsonArr = json_decode($_POST['params'], true);

require (dirname(__FILE__)."/dbConnect.php");

// DB connection made, now make our request
$response = array('text'=>array(), 'values'=>array(), 'vertices'=>array(), 'edges'=>array());

if($jsonArr['order'] == "alpha")
	$result = $tmdb->query("SELECT * FROM graphs ORDER BY filename ASC");
else if($jsonArr['order'] == "small")
	$result = $tmdb->query("SELECT * FROM graphs ORDER BY vertices ASC");	
else if($jsonArr['order'] == "large")
	$result = $tmdb->query("SELECT * FROM graphs ORDER BY vertices DESC");

	if ($jsonArr['restrict'] == "collapsed"){
		while ($row = $result->fetch_array()) {
			if (strpos($row[0], "simple") == false && $row[2] >= $jsonArr['min'] && $row[2] <= $jsonArr['max'] && ($row[5] == $jsonArr['category'] || $jsonArr['category'] == "all")){
				array_push($response['text'], $row[1]);
				array_push($response['values'], $row[0]);
				array_push($response['vertices'], $row[2]);
				array_push($response['edges'], $row[3]);
			}			
		}
	}
	else if ($jsonArr['restrict'] == "simple"){
		while ($row = $result->fetch_array()) {
			if (strpos($row[0], "simple") != false && $row[2] >= $jsonArr['min'] && $row[2] <= $jsonArr['max'] && ($row[5] == $jsonArr['category'] || $jsonArr['category'] == "all")){
				array_push($response['text'], $row[1]);
				array_push($response['values'], $row[0]);
				array_push($response['vertices'], $row[2]);
				array_push($response['edges'], $row[3]);
			}
		}
	}
	else {
		while ($row = $result->fetch_array()) {
			if ($row[2] >= $jsonArr['min'] && $row[2] <= $jsonArr['max'] && ($row[5] == $jsonArr['category'] || $jsonArr['category'] == "all")){
				array_push($response['text'], $row[1]);
				array_push($response['values'], $row[0]);
				array_push($response['vertices'], $row[2]);
				array_push($response['edges'], $row[3]);
			}
		}
		
	} 

	$result->close();
	$tmdb->close();
	echo json_encode($response);
?>