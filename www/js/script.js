			/*global alert, google, DOMParser, XMLSerializer, Blob, URL */
			/*global speedView, sizeview, snameView */

			var tid = null;
			var marker1 = null;
			var mapdh;

			var debugMode = 0;
			//var sdragging = 0;

			var geoapi_id = null;

			var loggingts = 0;
			var loggingInterval = 15000;
			var gpsrcvtm = 0;

			var stationts = 0;
			var stationinterval = 60000;
			var  stationname = "";
			var snameresolver = null;

			var gpslog = [];
			var gpsgdata = [];
			var configView = false;
			var graphView = false;

			var  protocol = "http";

			var plPosMemo = null;
			var plList = [];

			var gpsdetbusy = false;
			var gpsdetbusycnt = 0;

			var nearStationName = "";
			var nearStationDistance;
			var nearStationPassed = 0;

			if (window.location.protocol === "https:") {
				protocol = "https";
			}

			/**************************************************************************/
			function debugLog(msg) {
				'use strict';
				//console.log(msg);
				if (debugMode !== 0) {
					document.getElementById('debugview').innerHTML = msg;
				}
			}
			/*************************************************************************/
			function digit2(val) {
				'use strict';
				var digit2str = val.toString(10);
				if (val < 10) {
					digit2str = "0" + digit2str;
				}
				return digit2str;
			}

			/*************************************************************************/
			function hex2(val) {
				'use strict';
				var hex2str = val.toString(16).toUpperCase();
				if (val < 16) {
					hex2str = "0" + hex2str;
				}
				return hex2str;
			}

			/**************************************************************************/
			function yyyyfloor(str, keta) {
				'use strict';
				var srcVal, rVal, param;
				srcVal = parseFloat(str, 10);
				param = Math.pow(10, keta);
				rVal = Math.floor(srcVal * param) / param;
				return rVal;
			}
			/*************************************************************************/
			function mps2kmph(mps) {
				'use strict';
				return (mps * 3.6);
			}

			/*************************************************************************/
			function unixTimeNow() {
				'use strict';
				var d, unixTime;
				d = new Date();
				unixTime = Math.floor(d.getTime() / 1000);
				return unixTime;
			}
			/*************************************************************************/
			function ts2gmt(ts) {
				'use strict';
				var d, YYYY, MM, DD, hh, mm, ss, dtstr;
				if (ts === "now") {
					d = new Date();
				} else {
					d = new Date(ts);
				}
				YYYY = d.getUTCFullYear();
				MM   = d.getUTCMonth() + 1;
				DD   = d.getUTCDate();
				hh   = d.getUTCHours();
				mm   = d.getUTCMinutes();
				ss   = d.getUTCSeconds();
				dtstr = YYYY + "/" + digit2(MM) + "/" + digit2(DD) + " " + digit2(hh) + ":" + digit2(mm) + ":" + digit2(ss);
				return dtstr;
			}

			/*************************************************************************/
			function dtstr(ts) {
				'use strict';
				var d, YYYY, MM, DD, hh, mm, ss, dtrstr;
				d = new Date(ts);
				YYYY = d.getUTCFullYear();
				MM   = d.getUTCMonth() + 1;
				DD   = d.getUTCDate();
				hh   = d.getUTCHours();
				mm   = d.getUTCMinutes();
				ss   = d.getUTCSeconds();
				dtrstr = YYYY + digit2(MM) + digit2(DD) + digit2(hh) + digit2(mm) + digit2(ss);
				return dtrstr;
			}

			/*************************************************************************/
			function hhmmstrlocal(ts) {
				'use strict';
				var d;
				d = new Date(ts);
				return (digit2(d.getHours()) + ":" + digit2(d.getMinutes()));
			}

			/*************************************************************************/
			function yyyyXmlSerialise(xmlobj) {
				'use strict';
				var serializer, xmlstr;
				serializer = new XMLSerializer();
				xmlstr = serializer.serializeToString(xmlobj);
				xmlstr = xmlstr.replace(/></g, ">\r\n<");
				return xmlstr;
			}

			/*************************************************************************/
			function getSingleNodeValue(xmlNode, tagName) {
				'use strict';
				var nodes, nodeCount, nodeValue;
				nodeValue = "";
				nodes = xmlNode.getElementsByTagName(tagName);
				if (nodes.length > 0) {
					nodeValue = nodes[0].textContent;
				}
				return nodeValue;
			}
			/*************************************************************************/
			function calcDistance(lat1, lng1, lat2, lng2) {
				'use strict';
				function radians(deg) {
					return (deg * Math.PI / 180);
				}
				var x1, x2, y1, y2, dis;
				y1 = radians(lat1);
				x1 = radians(lng1);
				y2 = radians(lat2);
				x2 = radians(lng2);

				dis = 6371000 * Math.acos(Math.cos(y1) * Math.cos(y2) * Math.cos(x1 - x2) + Math.sin(y1) * Math.sin(y2));
				dis = yyyyfloor(dis, -1);
				return (dis);
			}
			/*************************************************************************/
			function mapinit(mcHandle) {
				'use strict';
				var mapOptions, mapH;
				try {
					mapOptions = {
						center: new google.maps.LatLng(35.681382, 139.766084),
						zoom: 13,
						mapTypeId: google.maps.MapTypeId.ROADMAP,
						mapTypeControlOptions: {
							mapTypeIds: [
								google.maps.MapTypeId.ROADMAP,
								google.maps.MapTypeId.SATELLITE,
								google.maps.MapTypeId.HYBRID,
								google.maps.MapTypeId.TERRAIN
							],
							style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
						}
					};
					mapH = new google.maps.Map(mcHandle, mapOptions);
				} catch (err) {
					window.alert("initialize() Error " + err.message);
				}
				return mapH;
			}





			/*************************************************************************/
			var simpleapi = {
				interval: 60000,
				init: function () {
					'use strict';
				},
				requrl: function (lon, lat) {
					'use strict';
					return (protocol + "://ytomoaki.lv9.org/rpx/stationapi.xml?x=" + lon + "&y=" + lat + "&output=xml");
				},
				parseresult: function (snamexml) {
					'use strict';
					var xmlparser, xmlDoc, desc, nllen, ui, nl, sname, dl, rofs;

					xmlparser = new DOMParser();
					xmlDoc = xmlparser.parseFromString(snamexml, "text/xml");
					desc = "simpleapi";

					nl = xmlDoc.getElementsByTagName("name");
					sname = nl[0].textContent.slice(0, -1);
					dl = xmlDoc.getElementsByTagName("distance");
					rofs = dl[0].textContent;

					nllen = nl.length;
					if (nllen > 0) {
						for (ui = 0; ui < nllen; ui += 1) {
							desc += "," + nl[ui].textContent.slice(0, -1) + ":" + dl[ui].textContent + ",";
						}
					}
					return ({name: sname, distance: rofs, resdesc: desc});
				}
			};

			/*************************************************************************/
			var heartrailsapi = {
				interval: 60000,
				init: function () {
					'use strict';
				},
				requrl: function (lon, lat) {
					'use strict';
					return (protocol + "://ytomoaki.lv9.org/rpx/heartrailsapi.xml?method=getStations&x=" + lon + "&y=" + lat);
				},
				parseresult: function (snamexml) {
					'use strict';
					var xmlparser, xmlDoc, desc, nllen, ui, nl, sname, dl, rofs;

					xmlparser = new DOMParser();
					xmlDoc = xmlparser.parseFromString(snamexml, "text/xml");
					desc = "heartrails";

					nl = xmlDoc.getElementsByTagName("name");
					sname = nl[0].textContent;
					dl = xmlDoc.getElementsByTagName("distance");
					rofs = dl[0].textContent.slice(0, -1);

					nllen = nl.length;
					if (nllen > 0) {
						for (ui = 0; ui < nllen; ui += 1) {
							desc += "," + nl[ui].textContent + ":" + dl[ui].textContent.slice(0, -1);
						}
					}
					return ({name: sname, distance: rofs, resdesc: desc});
				}
			};

			/*************************************************************************/
			var ekidataapi = {
				interval: 5000,
				stationList: [],
				init: function () {
					'use strict';
				},
				requrl: function (lon, lat) {
					'use strict';
					return (protocol + "://ytomoaki.lv9.org/api/station.php?&x=" + lon + "&y=" + lat);
				},
				parseresult: function (snamexml) {
					'use strict';
					var xmlparser, xmlDoc, desc, nllen, ui, nl, sname, dl, rofs, sobj;

					xmlparser = new DOMParser();
					xmlDoc = xmlparser.parseFromString(snamexml, "text/xml");
					desc = "ekidata";

					this.stationList = [];
					nl = xmlDoc.getElementsByTagName("station");
					nllen = nl.length;
					if (nllen > 0) {
						for (ui = 0; ui < nllen; ui += 1) {
							sobj = {
								name:     getSingleNodeValue(nl[ui], "name"),
								distance: getSingleNodeValue(nl[ui], "distance"),
								x:        getSingleNodeValue(nl[ui], "x"),
								y:        getSingleNodeValue(nl[ui], "y")
							};
							this.stationList.push(sobj);
							desc += "," + sobj.name + ":" + sobj.distance;
						}
						return ({name: this.stationList[0].name, distance: this.stationList[0].distance, resdesc: desc});
					} else {
						return ({name: "", distance: "", resdesc: ""});
					}
				},
				calcNearStation: function (lon, lat) {
					'use strict';
					var dist, ui, slen, sdes, sname;
					
					sdes = 999999;
					sname = "";
					
					slen = this.stationList.length;
					if (slen > 0) {
						for (ui = 0; ui < slen; ui += 1) {
							dist = calcDistance(lat, lon, this.stationList[ui].y, this.stationList[ui].x);
							if ((sdes >= dist) || sname === "") {
								sdes = dist;
								sname = this.stationList[ui].name;
							}
						}
						return ({name: sname, distance: sdes, resdesc: ""});
					} else {
						return ({name: "", distance: "", resdesc: ""});
					}
				}
			};


			/**************************************************************************/
			function buildNmeaStr(gpslog) {
				'use strict';
				var nmeastr, cnt, ui, estr;

				/**************************************************************************/
				function nmeaCalcChecksum(str) {
					var csum, ui;
					csum = 0;
					for (ui = 1; ui < str.length; ui += 1) {
						csum = csum ^ str.charCodeAt(ui);
					}
					return csum;
				}

				/**************************************************************************/
				function nmeaDdmm2dddd(ddmm, flag) {
					var ddFloat, ddIntPart, ddLowPart, dddd;
					ddFloat = parseFloat(ddmm);
					ddIntPart = parseInt(ddFloat / 100, 10);
					ddLowPart = (ddFloat - (ddIntPart * 100)) / 60;
					dddd = ddIntPart + ddLowPart;
					if (flag === "S" || flag === "W") {
						dddd = -dddd;
					}
					return dddd;
				}

				/**************************************************************************/
				function nmeaDddd2ddmm(dddd) {
					var absdddd, ddddIntPart, ddddLowPart, ddmm, ddmm4;
					absdddd = Math.abs(dddd);
					ddddIntPart = parseInt(absdddd, 10);
					ddddLowPart = absdddd - ddddIntPart;
					//ddmm = ddddIntPart * 100 + ddddLowPart * 60;
					return (yyyyfloor(ddddIntPart * 100 + ddddLowPart * 60, 4));
				}
				/**************************************************************************/
				function nmeaTime(ts) {	var d;	d = new Date(ts);	return (digit2(d.getUTCHours()) + digit2(d.getUTCMinutes()) + digit2(d.getUTCSeconds())); }
				function nmeaDate(ts) {	var d;	d = new Date(ts);	return (digit2(d.getUTCDate()) + digit2(d.getUTCMonth() + 1) + digit2(d.getUTCFullYear() % 100)); }
				function nmeaEorW(lat) {	return ((lat < 0) ? "W" : "E");	}
				function nmeaNorS(lon) {	return ((lon < 0) ? "S" : "N");	}
				/**************************************************************************/
				function nmeaMps2Knot(mps) {
					var knot = "";
					if (isNaN(mps) === false) {
						knot = 1.9438 * mps;
						if (knot > 1000) {
							knot = 999.9;
						}
						knot = yyyyfloor(knot, 1);
					}
					return knot;
				}
				/**************************************************************************/
				function nmeaBuildGPGGA(gpsdata) {
					var gpggarow;
					try {
						gpggarow = "$GPGGA," + nmeaTime(gpsdata.time) + "," +
								nmeaDddd2ddmm(gpsdata.lat) + "," + nmeaNorS(gpsdata.lat) + "," +
								nmeaDddd2ddmm(gpsdata.lon) + "," + nmeaEorW(gpsdata.lon) + "," +
								"1,,," +
								gpsdata.alt + ",M," +
								",,,";
					} catch (err) {
						alert(err);
					}
					return (gpggarow + "*" + hex2(nmeaCalcChecksum(gpggarow)));
				}

				/**************************************************************************/
				function nmeaBuildGPRMC(gpsdata) {
					var gprmcrow;
					try {
						gprmcrow = "$GPRMC," + nmeaTime(gpsdata.time) + ",A," +
							nmeaDddd2ddmm(gpsdata.lat) + "," + nmeaNorS(gpsdata.lat) + "," +
							nmeaDddd2ddmm(gpsdata.lon) + "," + nmeaEorW(gpsdata.lon) + "," +
							nmeaMps2Knot(gpsdata.speed) + "," +
							yyyyfloor(gpsdata.head, 1) + "," +
							nmeaDate(gpsdata.time) + ",,,N";
					} catch (err) {
						alert(err);
					}
					return (gprmcrow + "*" + hex2(nmeaCalcChecksum(gprmcrow)));
				}
				
				
				
				
				nmeastr = "@WEB GPS Logger";
				cnt = gpslog.length;

				for (ui = 0; ui < cnt; ui += 1) {
					nmeastr = nmeastr + "\r\n" + nmeaBuildGPGGA(gpslog[ui]) + "\r\n" + nmeaBuildGPRMC(gpslog[ui]);
				}
				return nmeastr;
			}
			/*************************************************************************/
			function buildDateTimeStr(unixtime) {
				'use strict';
				var date, YY, MM, DD, hh, mm, ss, rstr;
				date = new Date(unixtime);
				YY = date.getUTCFullYear();
				MM = date.getUTCMonth() + 1;
				DD = date.getUTCDate();
				hh = date.getUTCHours();
				mm = date.getUTCMinutes();
				ss = date.getUTCSeconds();
				rstr = YY + "-" + digit2(MM) + "-" + digit2(DD) + "T" + digit2(hh) + ":" + digit2(mm) + ":" + digit2(ss) + ".000Z";
				return rstr;
			}

			/**************************************************************************/
			function buildGpxStr(gpslog) {
				'use strict';
				var gpxNs, gpxstr, cnt, ui, estr, gpxobj, gpsdata, trkpt_node, gpxnode, trksegnode, trknode, c_node;

				function yyyyCreateElementNS(ns, rNode, tName, tValue, attr) {
					var cnode, attrLen, ui;
					attrLen = 0;
					cnode = rNode.createElementNS(ns, tName);
					if (attr !== null) {
						attrLen = attr.length;
						for (ui = 0; ui < attrLen; ui += 1) {
							cnode.setAttribute(attr[ui][0], attr[ui][1]);
						}
					}
					if (tValue !== null) {
						cnode.textContent = tValue;
					}
					return cnode;
				}

				gpxNs = "http://www.topografix.com/GPX/1/1";
				cnt = gpslog.length;

				gpxobj = document.implementation.createDocument("", "", null);
				c_node = gpxobj.createProcessingInstruction("xml", "version='1.0' encoding='UTF-8'");
				gpxobj.appendChild(c_node);

				//gpxnode = gpxobj.createElementNS(gpxNs, "gpx");
				//gpxnode.setAttribute("version", "1.1");
				//gpxnode.setAttribute("creator", "WEB GPS Logger");
				//gpxobj.appendChild(gpxnode);
				gpxobj.appendChild(gpxnode = yyyyCreateElementNS(gpxNs, gpxobj, "gpx", null, [["version", "1.1"], ["creator", "WEB GPS Logger"]]));

				//trknode = gpxobj.createElementNS(gpxNs, "trk");
				//gpxnode.appendChild(trknode);
				gpxnode.appendChild(trknode = yyyyCreateElementNS(gpxNs, gpxobj, "trk", null, null));

				//trksegnode = gpxobj.createElementNS(gpxNs, "trkseg");
				//trknode.appendChild(trksegnode);
				trknode.appendChild(trksegnode = yyyyCreateElementNS(gpxNs, gpxobj, "trkseg", null, null));

				for (ui = 0; ui < gpslog.length; ui += 1) {
					gpsdata = gpslog[ui];
					//trkpt_node = gpxobj.createElementNS(gpxNs, "trkpt");
					//trkpt_node.setAttribute("lat", gpsdata.lat);
					//trkpt_node.setAttribute("lon", gpsdata.lon);
					trkpt_node = yyyyCreateElementNS(gpxNs, gpxobj, "trkpt", null, [["lat", gpsdata.lat], ["lon", gpsdata.lon]]);

					//c_node = gpxobj.createElementNS(gpxNs, "ele");
					//c_node.textContent = gpsdata.alt;
					//trkpt_node.appendChild(c_node);
					trkpt_node.appendChild(yyyyCreateElementNS(gpxNs, gpxobj, "ele", gpsdata.alt, null));

					//c_node = gpxobj.createElementNS(gpxNs, "time");
					//c_node.textContent = buildDateTimeStr(gpsdata.time);
					//trkpt_node.appendChild(c_node);
					trkpt_node.appendChild(yyyyCreateElementNS(gpxNs, gpxobj, "time", buildDateTimeStr(gpsdata.time), null));

					//c_node = gpxobj.createElementNS(gpxNs, "course");
					//c_node.textContent = gpsdata.head;
					//trkpt_node.appendChild(c_node);
					trkpt_node.appendChild(yyyyCreateElementNS(gpxNs, gpxobj, "course", gpsdata.head, null));

					//c_node = gpxobj.createElementNS(gpxNs, "speed");
					//c_node.textContent = gpsdata.speed;
					//trkpt_node.appendChild(c_node);
					trkpt_node.appendChild(yyyyCreateElementNS(gpxNs, gpxobj, "speed", gpsdata.speed, null));

					if (gpsdata.debuginfo !== "") {
						//c_node = gpxobj.createElementNS(gpxNs, "debuginfo");
						//c_node.textContent = gpsdata.debuginfo;
						//trkpt_node.appendChild(c_node);
						trkpt_node.appendChild(yyyyCreateElementNS(gpxNs, gpxobj, "debuginfo", gpsdata.debuginfo, null));
					}

					trksegnode.appendChild(trkpt_node);
				}

				gpxstr = yyyyXmlSerialise(gpxobj);
				return gpxstr;
			}

			/**************************************************************************/
			function save2file(filename, content, mimetype) {
				'use strict';
				try {
					if (window.navigator.msSaveBlob) {
						window.navigator.msSaveBlob(new Blob([content], { type: mimetype }), filename);
					} else {
						var alink = document.createElement("a");
						alink.href = URL.createObjectURL(new Blob([content], { type: mimetype }));
						alink.download = filename;
						document.body.appendChild(alink); //  FireFox specification
						alink.click();
						document.body.removeChild(alink); //  FireFox specification
					}
				} catch (err) {
					alert(err);
				}
			}




			/*************************************************************************/
			function createGraph(divName, nodeName) {
				//'use strict';

				var divH, svgEle, svgNs, pathEle, path, path2, ui, gwidth, gheight, gmarginl, gmarginr, gmargint, gmarginb, timespan, glogc, gdata, ctime, elog, logtm, espeed, maxspeed, ystep, yyyy, xstep, xofs, xxxx, xpos, ypos;

				svgNs = "http://www.w3.org/2000/svg";
				
				gwidth = 300;
				gheight = 240;
				gmarginl = 40;
				gmarginr = 10;
				gmargint = 10;
				gmarginb = 50;
				
				//timespan = 3600000;
				timespan = 600000;
				
				
				svgEle = document.createElementNS(svgNs, 'svg');
				svgEle.setAttribute("viewbox", "0 0 " + gwidth + " " + gheight);
				svgEle.setAttribute("width", gwidth);
				svgEle.setAttribute("height", gheight);
				svgEle.setAttribute("id", "chart");
				
				/* draw grid */
				pathEle = document.createElementNS(svgNs, 'path');
				//path = "M" + gmarginl + " " + gmargint + "L" + (gwidth - gmarginr) + " " + gmargint + "L" + (gwidth - gmarginr) + " " + (gheight - gmarginb) + "L" + gmarginl + " " + (gheight - gmarginb) + "Z";
				path = "M" + gmarginl + " " + gmargint + "H" + (gwidth - gmarginr) + "V" + (gheight - gmarginb) + "H" + gmarginl + "Z";
				pathEle.setAttribute("d", path);
				pathEle.setAttribute("class", "svgGridOut");
				//pathEle.setAttribute("stroke", "#FFFFFF");
				//pathEle.setAttribute("stroke-width", "1");
				//pathEle.setAttribute("fill", "#000000");
				svgEle.appendChild(pathEle);
				
				/* pickup latest 1hour data */
				glogc = gpsgdata.length;

				ctime = parseInt(new Date() / 1, 10);
				gdata = [];
				for (ui = 0; ui < glogc; ui += 1) {
					elog = gpsgdata[ui];
					logtm = elog.time;
					if (logtm > (ctime - timespan)) {
						if (isNaN(elog.speed) === true) {
							espeed = 0;
						} else {
							espeed = yyyyfloor(mps2kmph(elog.speed), 1);
						}
						gdata.push({time: logtm, spd: espeed, sname: elog.sname});
					}
				}
				
				maxspeed = 0;
				if (gdata.length > 0) {
					maxspeed = Math.max.apply(null, gdata.map(function (o) {return o.spd; }));
					maxspeed = Math.ceil(maxspeed / 10) * 10;
				}
				if (maxspeed < 50) {
					maxspeed = 50;
				}

				/*	horizontal grid line	*/
				ystep = 10;
				if (maxspeed > 400) {
					ystep = 100;
				} else if (maxspeed > 200) {
					ystep = 50;
				} else if (maxspeed > 80) {
					ystep = 20;
				}

				path = "";
				for (ui = 0; ui < maxspeed; ui += ystep) {
					yyyy = yyyyfloor(gheight - gmarginb - ui / maxspeed * (gheight - gmarginb - gmargint), 3);
					path = path + "M" + gmarginl + " " + yyyy + "H" + (gwidth - gmarginr);

					pathEle = document.createElementNS(svgNs, 'text');
					pathEle.setAttribute("x", gmarginl - 5);
					pathEle.setAttribute("y", yyyy);
					pathEle.setAttribute("class", "svgText1");
					pathEle.appendChild(document.createTextNode(ui));
					svgEle.appendChild(pathEle);
				}
				pathEle = document.createElementNS(svgNs, 'path');
				pathEle.setAttribute("d", path);
				pathEle.setAttribute("class", "svgGridInn");
				svgEle.appendChild(pathEle);

				/*	vertical grid line	*/
				xstep = 120000;
				xofs = xstep - (ctime - timespan) % xstep;
				path = "";
				for (ui = xofs; ui < timespan; ui += xstep) {
					xxxx = yyyyfloor(gmarginl + ui / timespan * (gwidth - gmarginr - gmarginl), 3);
					path = path + "M" + xxxx + " " + gmargint + "V" + (gheight - gmarginb);

					pathEle = document.createElementNS(svgNs, 'text');
					pathEle.setAttribute("x", xxxx);
					pathEle.setAttribute("y", gheight - gmarginb + 5);
					pathEle.setAttribute("class", "svgText1");
					pathEle.setAttribute("transform", "rotate(270," + xxxx + "," + (gheight - gmarginb + 5) + ")");
					pathEle.appendChild(document.createTextNode(hhmmstrlocal(ui + ctime - timespan)));
					svgEle.appendChild(pathEle);
				}
				pathEle = document.createElementNS(svgNs, 'path');
				pathEle.setAttribute("d", path);
				pathEle.setAttribute("class", "svgGridInn");
				svgEle.appendChild(pathEle);

				if (gdata.length > 0) {
					/*	graph body */
					xpos = yyyyfloor(gmarginl + (gdata[0].time - ctime + timespan) / timespan * (gwidth - gmarginr - gmarginl), 3);
					ypos = yyyyfloor(gheight - gmarginb, 3);
					path = "M" + xpos + " " + ypos;
					for (ui = 0; ui < gdata.length; ui += 1) {
						xpos = yyyyfloor(gmarginl + (gdata[ui].time - ctime + timespan) / timespan * (gwidth - gmarginr - gmarginl), 3);
						ypos = yyyyfloor(gheight - gmarginb - gdata[ui].spd / maxspeed * (gheight - gmarginb - gmargint), 3);
						path = path + "L" + xpos + " " + ypos;
						
						if (gdata[ui].sname !== "") {
							path2 = "M" + xpos + " " + gmargint + "V" + (gheight - gmarginb);
							pathEle = document.createElementNS(svgNs, 'path');
							pathEle.setAttribute("d", path2);
							pathEle.setAttribute("class", "svgGridStn");
							svgEle.appendChild(pathEle);

							pathEle = document.createElementNS(svgNs, 'text');
							pathEle.setAttribute("x", xpos);
							pathEle.setAttribute("y", gheight - gmarginb + 5);
							pathEle.setAttribute("class", "svgText3");
							pathEle.setAttribute("transform", "rotate(270," + xpos + "," + (gheight - gmarginb + 5) + ")");
							pathEle.appendChild(document.createTextNode(gdata[ui].sname));
							svgEle.appendChild(pathEle);
						}
					}
					xpos = yyyyfloor(gmarginl + (gdata[gdata.length - 1].time - ctime + timespan) / timespan * (gwidth - gmarginr - gmarginl), 3);
					ypos = yyyyfloor(gheight - gmarginb, 3);
					path = path + "L" + xpos + " " + ypos + "Z";

					pathEle = document.createElementNS(svgNs, 'path');
					pathEle.setAttribute("d", path);
					pathEle.setAttribute("class", "svgGridBodyY");
					svgEle.appendChild(pathEle);

				} else {
					/* no data */
				}
				
				divH = document.getElementById(divName);
				for (ui = divH.childNodes.length - 1; ui >= 0; ui -= 1) {
					divH.removeChild(divH.childNodes[ui]);
				}
				
				divH.appendChild(svgEle);
			}

			/*************************************************************************/
			function classListClean(objH, except) {
				'use strict';
				var classNs, ui, cl;
				classNs = objH.classList.length;
				for (ui = 0; ui < classNs; ui += 1) {
					cl = objH.classList[ui];
					if (cl !== except) {
						objH.classList.remove(cl);
					}
				}
			}





			/*************************************************************************/
			function pushGpsLog() {
				'use strict';

			}

			/*************************************************************************/
			function updateMap(gpsd, gpst) {
				'use strict';
				var npos, ppos, ppath;
				
				npos = new google.maps.LatLng(gpsd.latitude, gpsd.longitude);
				if (npos === null) {
					/*nullの時があるらしい*/
					gpsdetbusycnt += 1;
					return;
				}
				mapdh.setCenter(npos);
				if (isNaN(gpsd.heading) === false) {
					document.getElementById("compass").style.transform = "rotate(" + yyyyfloor(gpsd.heading, 1) + "deg)";

					if (marker1 === null) {
						if (parseInt(gpsd.speed, 10) > 2) {
							marker1 = new google.maps.Marker({
								position: npos,
								icon: {
									path: "M2 3 L -2 3 0 -3 2 3 Z",
									rotation: gpsd.heading,
									scale: 3,
									strokeColor: 'red',
									fillColor: 'red',
									fillOpacity: 0.5
								},
								draggable: false,
								map: mapdh
							});
						} else {
							marker1 = new google.maps.Marker({
								position: npos,
								icon: {
									path: "M3 0 A 3 3 0 0 1 -3 0 A 3 3 0 0 1 3 0 Z",
									rotation: 0,
									scale: 3,
									strokeColor: 'green',
									fillColor: 'green',
									fillOpacity: 0.5
								},
								draggable: false,
								map: mapdh
							});
						}
					} else {
						marker1.setPosition(npos);
						if (parseInt(gpsd.speed, 10) > 2) {
							marker1.setIcon(
								{
									path: "M2 3 L -2 3 0 -3 2 3 Z",
									rotation: gpsd.heading,
									scale: 3,
									strokeColor: 'red',
									fillColor: 'red',
									fillOpacity: 0.5
								}
							);
						} else {
							marker1.setIcon(
								{
									path: "M3 0 A 3 3 0 0 1 -3 0 A 3 3 0 0 1 3 0 Z",
									rotation: 0,
									scale: 3,
									strokeColor: 'green',
									fillColor: 'green',
									fillOpacity: 0.5
								}
							);
						}
					}
				} else {
					/* no heading parameter */
					if (marker1 === null) {
						marker1 = new google.maps.Marker({
							position: npos,
							icon: {
								path: "M3 0 A 3 3 0 0 1 -3 0 A 3 3 0 0 1 3 0 Z",
								rotation: 0,
								scale: 3,
								strokeColor: 'green',
								fillColor: 'green',
								fillOpacity: 0.5
							},
							draggable: false,
							map: mapdh
						});
					} else {
						//marker1.position = google.maps.LatLng(gpsd.latitude, gpsd.longitude);
						marker1.setPosition(npos);
					}
				}

				/*	polyline	*/
				try {
					if (plPosMemo !== null) {
						ppos = [
							plPosMemo,
							{lat: gpsd.latitude, lng: gpsd.longitude}
						];
						ppath = new google.maps.Polyline({
							path: ppos,
							geodesic: true,
							strokeColor: '#0000FF',
							strokeOpacity: 1.0,
							strokeWeight: 2
						});
						ppath.setMap(mapdh);
						plList.push(ppath);
					}
					plPosMemo = {lat: gpsd.latitude, lng: gpsd.longitude};
				} catch (err) {
					debugLog(err);
				}
				/*	polyline	*/
			}
			/*************************************************************************/
			function resolveStation(gpsd, gpst) {
				'use strict';
				if (snameresolver !== null) {
					var tsdiff, snamexml, requrl, pres, distanceThleshold;
					tsdiff = gpst - stationts;
					if (tsdiff > snameresolver.interval) {
						stationts = gpst;
						try {
							snamexml = new XMLHttpRequest();
							requrl = snameresolver.requrl(gpsd.longitude, gpsd.latitude);

							snamexml.open('GET', requrl, true);
							snamexml.onreadystatechange = function () {
								if (snamexml.readyState === 4) {
									if (snamexml.status === 200) {
										pres = snameresolver.parseresult(snamexml.responseText);
										distanceThleshold = document.getElementById("conf_snamedisth").value;
										if (parseInt(pres.distance, 10) < distanceThleshold) {
											snameView.innerHTML = pres.name.substr(0, 7) + " " + pres.distance;

											if (nearStationName === pres.name) {
												if (nearStationPassed === 0) {
													if (nearStationDistance >= pres.distance) {
														nearStationDistance = pres.distance;
													} else {
														if (pres.distance < 100) {
															if (gpsgdata.length >= 2) {
																gpsgdata[gpsgdata.length - 2].sname = nearStationName;
															}
															nearStationPassed = 1;
														}
													}
												}
											} else {
												nearStationName = pres.name;
												nearStationDistance = pres.distance;
												nearStationPassed = 0;
											}
										} else {
											snameView.innerHTML = "----";
										}
										debugLog("station det!!!! " + pres.name + " " + pres.distance);

										var logc = gpslog.length;
										//gpslog[logc - 1].debuginfo = pres.resdesc;
										gpslog[logc - 1].debuginfo = pres.resdesc + "(" + gpsdetbusycnt + ")";
									} else {
										//alert("station name api failed. " + snamexml.status);
										debugLog("station unknown!");
										snameView.innerHTML = "****";
									}
								}
							};
							snamexml.send(null);
						} catch (err) {
							alert(err);
						}
					} else {
						if (snameresolver.calcNearStation !== null) {
							pres = snameresolver.calcNearStation(gpsd.longitude, gpsd.latitude);
							distanceThleshold = document.getElementById("conf_snamedisth").value;
							if (parseInt(pres.distance, 10) < distanceThleshold) {
								snameView.innerHTML = pres.name.substr(0, 7) + " " + pres.distance;

								if (nearStationName === pres.name) {
									if (nearStationPassed === 0) {
										if (nearStationDistance >= pres.distance) {
											nearStationDistance = pres.distance;
										} else {
											if (pres.distance < 100) {
												if (gpsgdata.length >= 2) {
													gpsgdata[gpsgdata.length - 2].sname = nearStationName;
												}
												nearStationPassed = 1;
											}
										}
									}
								} else {
									nearStationName = pres.name;
									nearStationDistance = pres.distance;
									nearStationPassed = 0;
								}
							} else {
								snameView.innerHTML = "----";
							}
							debugLog("station calc!!!! " + pres.name + " " + pres.distance);
						}
					}
				}
			}
			/*************************************************************************/
			function locationDetect(position) {
				'use strict';
				//alert("GPS success." + position.coords.latitude + " / " + position.coords.longitude);
				//map1h.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
				var gpsd, gpst, msg, tdiff, npos, stsH;
				

				gpsrcvtm = unixTimeNow();

				stsH = document.getElementById("statusView");
				classListClean(stsH, 'detect');
				stsH.classList.add('detect');
				stsH.reserveClass = 'active';
				
				gpsd = position.coords;
				gpst = position.timestamp;
				
				msg = "lat : " + yyyyfloor(gpsd.latitude, 6) + "<BR>" +
								 "lon   : " + yyyyfloor(gpsd.longitude, 6) + "<BR>" +
								 "alt   : " + yyyyfloor(gpsd.altitude, 1) + "[m]<BR>" +
				//				 "acc   : " + gpsd.accuracy + "<BR>" +
				//				 "alc   : " + gpsd.altitudeAccuracy + "<BR>" +
								 "head  : " + yyyyfloor(gpsd.heading, 1) + "[degree]<BR>" +
								 "speed : " + yyyyfloor(mps2kmph(gpsd.speed), 1) + "[km/h]<BR>" +
								 "time  : " + ts2gmt(gpst);

				speedView.innerHTML = yyyyfloor(mps2kmph(gpsd.speed), 1) + " km/h";

				debugLog(yyyyfloor(gpsd.latitude, 3) + " / " + yyyyfloor(gpsd.longitude, 3));

				/*	ログ保存	*/
				tdiff = gpst - loggingts;
				loggingInterval = document.getElementById("conf_logint").value * 1000;
				if (tdiff >= loggingInterval) {
					gpslog.push({
						lat: yyyyfloor(gpsd.latitude, 6),
						lon: yyyyfloor(gpsd.longitude, 6),
						alt: yyyyfloor(gpsd.altitude, 1),
						head: yyyyfloor(gpsd.heading, 1),
						speed: yyyyfloor(gpsd.speed, 2),
						time: gpst,
						debuginfo: ""
					});
					//sizeview.innerHTML = gpslog.length + "(tdiff:" + gpst + " - " + loggingts + ")";
					sizeview.innerHTML = gpslog.length;
					loggingts = gpst;
				}
				/*グラフ用データ保存*/
				gpsgdata.push({
					//lat: yyyyfloor(gpsd.latitude, 6),
					//lon: yyyyfloor(gpsd.longitude, 6),
					alt: yyyyfloor(gpsd.altitude, 1),
					head: yyyyfloor(gpsd.heading, 1),
					speed: yyyyfloor(gpsd.speed, 2),
					time: gpst,
					sname: ""
				});

				document.getElementById("mapd").innerHTML =
					gpsd.latitude + "<BR>" +
					gpsd.longitude + "<BR>" +
					gpsd.altitude + "<BR>" +
					gpsd.heading +  "<BR>" +
					gpsd.speed;

				/*	アイコン更新	*/
				//updateMap(gpsd, gpst);

				/*	駅名解決	*/
				//resolveStation(gpsd, gpst);
			}
			/*************************************************************************/
			function locationFailed(evta) {
				'use strict';
				var error_msg = "unkonwn";
				switch (error.code) {
				case 1:
					error_msg = "PERMISSION_DENIED";
					break;
				case 2:
					error_msg = "POSITION_UNAVAILABLE";
					break;
				case 3:
					error_msg = "TIME_OUT";
					break;
				}
				//window.alert("GPS failed." + error_msg);
				document.getElementById("mapd").innerHTML = error_msg;
				debugLog("GPS failed. " + error_msg);
			}








			/*************************************************************************/
			function debugModeClicked(evta) {
				'use strict';
				if (debugMode === 1) {
					debugLog("Bye!");
					debugMode = 0;
					setTimeout(function () {
						if (debugMode === 0) {
							debugMode = 1;
							debugLog("");
							debugMode = 0;
						}
					}, 1000);
				} else {
					debugMode = 1;
					debugLog("Welcome!");
				}
			}

			function logClearClicked(evta) {
				'use strict';
				gpslog = [];
				sizeview.innerHTML = gpslog.length;
						
				/* clear Polyline */
				var polylineNs = plList.length;
				while (polylineNs > 0) {
					polylineNs -= 1;
					plList[polylineNs].setMap(null);
					plList.pop();
				}
			}

			function exportClicked(evta) {
				'use strict';
				var Stream, FileName, exp_mode;
				Stream = "under test.";
				FileName = "hoge.txt";

				exp_mode = document.getElementById("conf_expmode").value;
				if (gpslog.length > 0) {
					switch (exp_mode) {
					case "nmea":
						Stream = buildNmeaStr(gpslog);
						FileName = "YL" + dtstr(gpslog[0].time) + ".log";
						save2file(FileName, Stream, "text/plain");
						break;
					default:
					/*case "gpx":*/
						Stream = buildGpxStr(gpslog);
						FileName = "YL" + dtstr(gpslog[0].time) + ".gpx";
						save2file(FileName, Stream, "application/gpx");
						break;
					}
				} else {
					alert("no gps data!");
				}
			}

			function confViewClicked(evta) {
				'use strict';
				var confH = document.getElementById("config");
				if (configView === true) {
					confH.classList.remove('show');
					confH.classList.add('hide');
					configView = false;
				} else {
					confH.classList.remove('hide');
					confH.classList.add('show');
					configView = true;
				}
			}

			function confCloseClicked(evta) {
				'use strict';
				var confH = document.getElementById("config");
				confH.classList.remove('show');
				confH.classList.add('hide');
				configView = false;
			}

			function graphViewClicked(evta) {
				'use strict';
				var confH = document.getElementById("graphd");
				if (graphView === true) {
					confH.classList.remove('show');
					confH.classList.add('hide');
					graphView = false;
				} else {
					confH.classList.remove('hide');
					confH.classList.add('show');
					graphView = true;
					
					createGraph("graphd", "ele");
				}
			}

			function snameApiChange(evta) {
				'use strict';
				var confH, sel;

				sel = evta.target.value;
				//sel = this.value;

				switch (sel) {
				case "off":
					snameresolver = null;
					break;
				case "simpleapi":
					snameresolver = simpleapi;
					break;
				case "heartrailsapi":
					snameresolver = heartrailsapi;
					break;
				default:
				/*case "ekidataapi":*/
					snameresolver = ekidataapi;
					break;
				}

				confH = document.getElementById("snameView");
				if (snameresolver === null) {
					confH.classList.remove('show');
					confH.classList.add('hide');
				} else {
					snameresolver.init();
					confH.classList.remove('hide');
					confH.classList.add('show');
				}

			}

			function measureClicked(evta) {
				'use strict';
				var stsH = document.getElementById("statusView");
				if (geoapi_id === null) {
					classListClean(stsH, 'active');
					stsH.classList.add('active');
					geoapi_id = navigator.geolocation.watchPosition(locationDetect, locationFailed);
					//evta.target.value = "STOP";
				} else {
					classListClean(stsH, 'active');
					stsH.classList.add('inactive');
					navigator.geolocation.clearWatch(geoapi_id);
					geoapi_id = null;
					//evta.target.value = "START";
				}
			}


			/*************************************************************************/
			function f1000msTimer() {
				'use strict';
				var ctime, stsH, tdiff;
				if (gpsrcvtm !== 0) {
					ctime = unixTimeNow();
					tdiff = ctime - gpsrcvtm;
					if (tdiff > 60) {
						stsH = document.getElementById("statusView");
						classListClean(stsH, 'loss');
						stsH.classList.add('loss');
						stsH.reserveClass = null;
						//debugLog("interval 2 " + tdiff);
					}
				}
				if (graphView === true) {
					createGraph("graphd", "ele");
				}
			}
			/*************************************************************************/
			function initialize() {
				'use strict';
				//var mapdh;
				var t1000id, stsH;
				//mapdh = mapinit(document.getElementById("mapd"));

				t1000id = setInterval(f1000msTimer, 1000);
				stsH = document.getElementById("statusView");

				document.getElementById("footerid").addEventListener('click', debugModeClicked);
				document.getElementById("measure").addEventListener('click', measureClicked);

				document.getElementById("conf_logclear").addEventListener('click', logClearClicked);
				document.getElementById("conf_exp").addEventListener('click', exportClicked);
				document.getElementById("conf").addEventListener('click', confViewClicked);
				document.getElementById("mode").addEventListener('click', graphViewClicked);
				document.getElementById("conf_close").addEventListener('click', confCloseClicked);
				document.getElementById("conf_snameapi").addEventListener('change', snameApiChange);

				document.getElementById("conf_fdate").innerHTML = navigator.userAgent + "<BR>(touchp: " + navigator.maxTouchPoints + ")";

				stsH.addEventListener('transitionend', function () {
					if (stsH.reserveClass !== undefined && stsH.reserveClass !== null) {
						classListClean(stsH, stsH.reserveClass);
						stsH.classList.add(stsH.reserveClass);
						stsH.reserveClass = null;
					}
				});


				
				if (document.getElementById("conf_snameapi").value !== "off") {
					switch (document.getElementById("conf_snameapi").value) {
					case "simpleapi":
						snameresolver = simpleapi;
						break;
					case "heartrailsapi":
						snameresolver = heartrailsapi;
						break;
					default:
					/*case "ekidataapi":*/
						snameresolver = ekidataapi;
						break;
					}
					snameresolver.init();
					document.getElementById("snameView").classList.remove('hide');
					document.getElementById("snameView").classList.add('show');
				}

			}







			/*************************************************************************/
			function updateSizeView() {
				'use strict';
				debugLog("size changed. " + window.innerWidth + "x" + window.innerHeight);
			}











			/*************************************************************************/



			window.onload = initialize;
