import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOptimizedImageUrl } from './cloudinary';

const getPlayerInitials = (p) => {
  if (!p) return 'P';
  const first = p.first_name?.trim().charAt(0) || '';
  const last = p.last_name?.trim().charAt(0) || '';
  return (first + last).toUpperCase() || 'P';
};

export const createInitialsAvatar = (initials, size = 200, isCircular = false) => {
  if (!initials) initials = 'P';
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    if (isCircular) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = Math.max(4, Math.floor(size * 0.03));
      ctx.strokeRect(2, 2, size - 4, size - 4);
    }

    ctx.fillStyle = "#fbbf24";
    ctx.font = `bold ${Math.floor(size * 0.4)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials.toUpperCase().slice(0, 2), size / 2, size / 2);

    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
};

const renderImageToCanvas = (src, width, height, isCircular, setCrossOrigin = false) => {
  return new Promise((resolve) => {
    const img = new Image();
    if (setCrossOrigin) {
      img.crossOrigin = 'Anonymous';
    }

    const timer = setTimeout(() => {
      resolve(null);
    }, 6000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (isCircular) {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        } else {
          const r = Math.floor(width * 0.04);
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(width - r, 0);
          ctx.quadraticCurveTo(width, 0, width, r);
          ctx.lineTo(width, height - r);
          ctx.quadraticCurveTo(width, height, width - r, height);
          ctx.lineTo(r, height);
          ctx.quadraticCurveTo(0, height, 0, height - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          ctx.clip();
        }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, width, height);

        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (e) {
        console.warn("Canvas export error:", e);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = src;
  });
};

export const getBase64ImageFromURL = async (url, options = {}) => {
  const { isCircular = false, width = 200, height = 200, fallbackInitials = '' } = options;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return createInitialsAvatar(fallbackInitials, width, isCircular);
  }

  const cleanUrl = url.trim();

  // Tier 1: Try fetch -> blob -> createObjectURL -> Canvas (solves CORS / Canvas Taint & caching issues)
  try {
    const response = await fetch(cleanUrl, { mode: 'cors', cache: 'force-cache' });
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const dataUrl = await renderImageToCanvas(objectUrl, width, height, isCircular);
      URL.revokeObjectURL(objectUrl);
      if (dataUrl) return dataUrl;
    }
  } catch (fetchErr) {
    console.warn("Fetch blob failed for image URL, attempting direct img tag fallback:", cleanUrl, fetchErr);
  }

  // Tier 2: Try direct Image tag with crossOrigin = 'Anonymous'
  try {
    const dataUrl = await renderImageToCanvas(cleanUrl, width, height, isCircular, true);
    if (dataUrl) return dataUrl;
  } catch (imgErr) {
    console.warn("Direct crossOrigin image load failed:", cleanUrl, imgErr);
  }

  // Tier 3: Try direct Image tag without crossOrigin
  try {
    const dataUrl = await renderImageToCanvas(cleanUrl, width, height, isCircular, false);
    if (dataUrl) return dataUrl;
  } catch (err) {
    console.warn("Direct image load failed:", cleanUrl, err);
  }

  // Fallback to Initials Avatar if all methods fail
  return createInitialsAvatar(fallbackInitials, width, isCircular);
};

export const generateSingleTeamPDF = async (activeAuction, team, squad, options = {}) => {
  if (!activeAuction || !team) {
    alert("No team data available to generate PDF.");
    return null;
  }
  const customFilename = `${team.team_name.replace(/ /g, '_')}_Squad.pdf`;
  return await generateAllTeamsPDF(activeAuction, [team], { [team.id]: squad }, { customFilename, ...options });
};

/**
 * Generate PDF List View for All Teams with big square photos and 10-12 players per page
 */
export const generateAllTeamsPDF = async (activeAuction, teams, squads, options = {}) => {
  if (!activeAuction || !teams || teams.length === 0) {
    alert("No data available to generate PDF.");
    return null;
  }
  const { saveFile = true, customFilename } = options;

  const doc = new jsPDF();
  const maxBudget = activeAuction?.max_budget || 0;

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const squad = squads[team.id] || [];

    if (i > 0) {
      doc.addPage();
    }

    let startY = 20;

    let logoLoaded = false;
    if (team.logo_url) {
      try {
        const logoBase64 = await getBase64ImageFromURL(team.logo_url, { isCircular: false, width: 120, height: 120 });
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
          logoLoaded = true;
        }
      } catch (e) {
        console.error(`Failed to load team logo for ${team.team_name}`, e);
      }
    }

    const textX = logoLoaded ? 38 : 14;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(activeAuction?.auction_name?.toUpperCase() || 'AUCTION DETAILS', 14, 10);

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text(team.team_name.toUpperCase(), textX, 19);

    const spent = squad.reduce((acc, p) => acc + (p.sold_price || 0), 0);
    const remaining = maxBudget - spent;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);

    const statsText = `Purse Spent: INR ${spent.toLocaleString()}  |  Purse Remaining: INR ${remaining.toLocaleString()}  |  Players: ${squad.length}/${activeAuction?.max_players || 11}`;
    doc.text(statsText, textX, 26);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    startY = 36;

    const isCapt = (p) => p.is_captain || (team.captain_id && (p.id === team.captain_id || p.auction_player_id === team.captain_id));
    const isViceCapt = (p) => team.vice_captain_id && (p.id === team.vice_captain_id || p.auction_player_id === team.vice_captain_id);

    const captains = squad.filter(p => isCapt(p));
    const viceCaptains = squad.filter(p => isViceCapt(p) && !isCapt(p));
    const icons = squad.filter(p => p.is_icon && !isCapt(p) && !isViceCapt(p));
    const owners = squad.filter(p => p.is_owner && !isCapt(p) && !isViceCapt(p));
    const auctioned = squad.filter(p => !p.is_icon && !p.is_owner && !p.is_captain && !isCapt(p) && !isViceCapt(p));
    const sortedAuctioned = [...auctioned].sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0));

    const combinedPlayers = [...captains, ...viceCaptains, ...icons, ...owners, ...sortedAuctioned];

    // Preload player photos concurrently with robust multi-tiered loader
    const photoPromises = combinedPlayers.map(p => {
      const playerDetails = p.players || {};
      const photoUrl = playerDetails.photo_url ? getOptimizedImageUrl(playerDetails.photo_url, 300) : null;
      const initials = getPlayerInitials(playerDetails);
      return getBase64ImageFromURL(photoUrl, { isCircular: false, width: 200, height: 200, fallbackInitials: initials });
    });
    const playerPhotos = await Promise.all(photoPromises);

    const tableColumn = ["Sr.", "Photo", "Player Name", "Role", "Batting", "Bowling", "Bid Price", "Tag"];

    const tableRows = combinedPlayers.map((p, index) => {
      const playerDetails = p.players || {};
      const fullName = `${playerDetails.first_name || ''} ${playerDetails.last_name || ''}`.trim() || 'Unknown';
      const capt = isCapt(p);
      const viceCapt = isViceCapt(p);

      let designation = 'Squad Player';
      if (capt) designation = 'Captain';
      else if (viceCapt) designation = 'Vice-Captain';
      else if (p.is_icon) designation = 'Icon';
      else if (p.is_owner) designation = 'Owner';

      return [
        index + 1,
        '',
        fullName,
        playerDetails.player_role || '-',
        playerDetails.batting_style || '-',
        playerDetails.bowling_style || '-',
        (!p.sold_price && (p.is_icon || p.is_captain || capt || viceCapt)) ? 'Retained (₹0)' : `INR ${(p.sold_price || 0).toLocaleString()}`,
        designation
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        verticalAlign: 'middle',
        textColor: [33, 37, 41],
        minCellHeight: 18
      },
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        6: { halign: 'right' },
        7: { cellWidth: 26, halign: 'center' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 1) {
            const photoBase64 = playerPhotos[data.row.index];
            if (photoBase64) {
              const imgDim = 15;
              const x = data.cell.x + (data.cell.width - imgDim) / 2;
              const y = data.cell.y + (data.cell.height - imgDim) / 2;
              try {
                doc.setDrawColor(255, 215, 0);
                doc.setLineWidth(0.4);
                doc.rect(x - 0.5, y - 0.5, imgDim + 1, imgDim + 1);
                doc.addImage(photoBase64, 'PNG', x, y, imgDim, imgDim);
              } catch (err) {
                console.error("Error drawing player photo in team PDF:", err);
              }
            }
          }

          if (data.column.index === 7) {
            const desig = data.cell.text[0];
            if (desig === 'Captain') {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = 'bold';
            } else if (desig === 'Vice-Captain') {
              data.cell.styles.fillColor = [224, 242, 254];
              data.cell.styles.textColor = [3, 105, 161];
              data.cell.styles.fontStyle = 'bold';
            } else if (desig === 'Icon') {
              data.cell.styles.fillColor = [254, 240, 138];
              data.cell.styles.textColor = [161, 98, 7];
              data.cell.styles.fontStyle = 'bold';
            } else if (desig === 'Owner') {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${pageCount} of ${doc.internal.getNumberOfPages()}  |  Generated on ${new Date().toLocaleDateString()}`, 14, 285);
  }

  if (saveFile) {
    const filename = customFilename || `All_Teams_Squad_${activeAuction?.auction_name?.replace(/ /g, '_') || 'List'}.pdf`;
    doc.save(filename);
  }
  return doc;
};

/**
 * Generate PDF List View for Players with 10-12 players per page, Area removed, and Captain/Icon/Owner Tags added
 */
export const generatePlayersListPDF = async (dataToExport, filename, activeAuction, pdfGroup = 'none') => {
  const doc = new jsPDF();
  let startY = 15;

  if (activeAuction) {
    if (activeAuction.auction_logo) {
      try {
        const logoBase64 = await getBase64ImageFromURL(activeAuction.auction_logo, { isCircular: false, width: 120, height: 120 });
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, 8, 20, 20);

          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(26, 54, 93);
          doc.text(activeAuction.auction_name || 'Auction Details', 38, 16);

          doc.setFontSize(9.5);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(71, 85, 105);
          const dateStr = activeAuction.auction_date ? `Date: ${activeAuction.auction_date}` : '';
          const venueStr = activeAuction.venue ? `Venue: ${activeAuction.venue}` : '';
          doc.text(`${dateStr} ${venueStr ? ' | ' + venueStr : ''}`, 38, 22);

          doc.text("Players List", 38, 27);
          startY = 33;
        } else {
          doc.setFontSize(16);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(26, 54, 93);
          doc.text(activeAuction.auction_name || 'Auction Details', 14, 16);
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text("Players List", 14, 24);
          startY = 30;
        }
      } catch (e) {
        console.error("Error loading logo for PDF", e);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(26, 54, 93);
        doc.text(activeAuction.auction_name || 'Auction Details', 14, 16);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Players List", 14, 24);
        startY = 30;
      }
    } else {
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text(activeAuction.auction_name || 'Auction Details', 14, 16);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const dateStr = activeAuction.auction_date ? `Date: ${activeAuction.auction_date}` : '';
      const venueStr = activeAuction.venue ? `Venue: ${activeAuction.venue}` : '';
      if (dateStr || venueStr) {
        doc.text(`${dateStr} ${venueStr ? ' | ' + venueStr : ''}`, 14, 23);
        doc.text("Players List", 14, 29);
        startY = 35;
      } else {
        doc.text("Players List", 14, 23);
        startY = 29;
      }
    }
  } else {
    doc.setFontSize(16);
    doc.text('Players List', 14, 15);
    startY = 25;
  }

  const sorted = [...dataToExport].sort((a, b) => (a.player_number ?? 9999) - (b.player_number ?? 9999));

  // Preload player photos using robust multi-tiered loader
  const photoPromises = sorted.map(player => {
    const photoUrl = player.photo_url ? getOptimizedImageUrl(player.photo_url, 300) : null;
    const initials = getPlayerInitials(player);
    return getBase64ImageFromURL(photoUrl, { isCircular: false, width: 200, height: 200, fallbackInitials: initials });
  });
  const photoMapList = await Promise.all(photoPromises);

  const tableColumn = ["Photo", "Player No.", "Name", "Role", "Batting", "Bowling", "Tag"];

  const getTagText = (p) => {
    if (p.is_captain) return 'Captain';
    if (p.is_vice_captain) return 'Vice-Captain';
    if (p.is_owner) return 'Owner';
    if (p.is_icon) return 'Icon';
    return 'Squad Player';
  };

  if (pdfGroup === 'none') {
    const tableRows = sorted.map((player) => [
      '',
      player.player_number != null ? `#${player.player_number}` : '-',
      `${player.first_name || ''} ${player.last_name || ''}`.trim(),
      player.player_role || '-',
      player.batting_style || '-',
      player.bowling_style || '-',
      getTagText(player)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        verticalAlign: 'middle',
        minCellHeight: 18
      },
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 28, halign: 'center' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 0) {
            const photoBase64 = photoMapList[data.row.index];
            if (photoBase64) {
              const imgDim = 15;
              const x = data.cell.x + (data.cell.width - imgDim) / 2;
              const y = data.cell.y + (data.cell.height - imgDim) / 2;
              try {
                doc.setDrawColor(255, 215, 0);
                doc.setLineWidth(0.4);
                doc.rect(x - 0.5, y - 0.5, imgDim + 1, imgDim + 1);
                doc.addImage(photoBase64, 'PNG', x, y, imgDim, imgDim);
              } catch (err) {
                console.error("Error drawing photo in player PDF:", err);
              }
            }
          }

          if (data.column.index === 6) {
            const tagVal = data.cell.text[0];
            if (tagVal === 'Captain') {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = 'bold';
            } else if (tagVal === 'Vice-Captain') {
              data.cell.styles.fillColor = [224, 242, 254];
              data.cell.styles.textColor = [3, 105, 161];
              data.cell.styles.fontStyle = 'bold';
            } else if (tagVal === 'Icon') {
              data.cell.styles.fillColor = [254, 240, 138];
              data.cell.styles.textColor = [161, 98, 7];
              data.cell.styles.fontStyle = 'bold';
            } else if (tagVal === 'Owner') {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });
  } else {
    const fieldMapping = {
      'area': 'area',
      'role': 'player_role'
    };
    const field = fieldMapping[pdfGroup] || pdfGroup;

    const playerIndexMap = new Map();
    sorted.forEach((p, idx) => playerIndexMap.set(p.id || idx, idx));

    const grouped = sorted.reduce((acc, player) => {
      const key = player[field] || 'Unspecified';
      if (!acc[key]) acc[key] = [];
      acc[key].push(player);
      return acc;
    }, {});

    let currentY = startY;
    Object.keys(grouped).sort().forEach((groupName) => {
      const groupPlayers = grouped[groupName];
      const groupTitle = `${groupName.toUpperCase()} (${groupPlayers.length} Players)`;

      if (currentY > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        currentY = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text(groupTitle, 14, currentY);
      currentY += 4;

      const tableRows = groupPlayers.map((player) => [
        '',
        player.player_number != null ? `#${player.player_number}` : '-',
        `${player.first_name || ''} ${player.last_name || ''}`.trim(),
        player.player_role || '-',
        player.batting_style || '-',
        player.bowling_style || '-',
        getTagText(player)
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        margin: { top: 10 },
        styles: { fontSize: 9, cellPadding: 3, verticalAlign: 'middle', minCellHeight: 18 },
        headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 28, halign: 'center' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 0) {
              const playerObj = groupPlayers[data.row.index];
              const originalIndex = playerIndexMap.get(playerObj?.id);
              const photoBase64 = photoMapList[originalIndex];
              if (photoBase64) {
                const imgDim = 15;
                const x = data.cell.x + (data.cell.width - imgDim) / 2;
                const y = data.cell.y + (data.cell.height - imgDim) / 2;
                try {
                  doc.setDrawColor(255, 215, 0);
                  doc.setLineWidth(0.4);
                  doc.rect(x - 0.5, y - 0.5, imgDim + 1, imgDim + 1);
                  doc.addImage(photoBase64, 'PNG', x, y, imgDim, imgDim);
                } catch (err) {
                  console.error("Error drawing photo in grouped PDF:", err);
                }
              }
            }

            if (data.column.index === 6) {
              const tagVal = data.cell.text[0];
              if (tagVal === 'Captain') {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.textColor = [180, 83, 9];
                data.cell.styles.fontStyle = 'bold';
              } else if (tagVal === 'Vice-Captain') {
                data.cell.styles.fillColor = [224, 242, 254];
                data.cell.styles.textColor = [3, 105, 161];
                data.cell.styles.fontStyle = 'bold';
              } else if (tagVal === 'Icon') {
                data.cell.styles.fillColor = [254, 240, 138];
                data.cell.styles.textColor = [161, 98, 7];
                data.cell.styles.fontStyle = 'bold';
              } else if (tagVal === 'Owner') {
                data.cell.styles.fillColor = [220, 252, 231];
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 12;
    });
  }

  doc.save(filename);
};

export const generatePlayerSlidesPDF = async (playersList, filename, activeAuction) => {
  if (!playersList || playersList.length === 0) {
    alert("No players available to export.");
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;

  let auctionLogoBase64 = null;
  if (activeAuction?.auction_logo) {
    auctionLogoBase64 = await getBase64ImageFromURL(activeAuction.auction_logo, { isCircular: false, width: 150, height: 150 });
  }

  for (let i = 0; i < playersList.length; i++) {
    const p = playersList[i];
    const playerDetails = p.players || p;

    if (i > 0) doc.addPage();

    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageWidth, 26, 'F');

    if (auctionLogoBase64) {
      doc.addImage(auctionLogoBase64, 'PNG', 12, 3, 20, 20);
    }
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text((activeAuction?.auction_name || 'MALANG CRICKET AUCTION').toUpperCase(), auctionLogoBase64 ? 36 : 15, 14);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(255, 215, 0);
    doc.text("PLAYER PROFILE SLIDE", auctionLogoBase64 ? 36 : 15, 21);

    const playerNum = p.player_number ?? playerDetails.player_number;
    if (playerNum != null) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`PLAYER #${playerNum}`, pageWidth - 15, 16, { align: 'right' });
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 34, pageWidth - 30, pageHeight - 48, 4, 4, 'FD');

    const photoSize = 80;
    const photoX = 25;
    const photoY = 44;

    const photoUrl = playerDetails.photo_url ? getOptimizedImageUrl(playerDetails.photo_url, 500) : null;
    const initials = getPlayerInitials(playerDetails);
    const photoBase64 = await getBase64ImageFromURL(photoUrl, { isCircular: false, width: 450, height: 450, fallbackInitials: initials });

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(1.5);
    doc.roundedRect(photoX - 2.5, photoY - 2.5, photoSize + 5, photoSize + 5, 3, 3, 'FD');

    if (photoBase64) {
      try {
        doc.addImage(photoBase64, 'PNG', photoX, photoY, photoSize, photoSize);
      } catch (err) {
        console.error("Error drawing photo in slide PDF:", err);
      }
    }

    const roleText = (playerDetails.player_role || 'CRICKETER').toUpperCase();
    doc.setFillColor(26, 54, 93);
    doc.roundedRect(photoX, photoY + photoSize + 5, photoSize, 12, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 215, 0);
    doc.text(roleText, photoX + (photoSize / 2), photoY + photoSize + 12.5, { align: 'center' });

    const detailX = photoX + photoSize + 22;
    let detailY = 48;

    const firstName = (playerDetails.first_name || '').toUpperCase();
    const lastName = (playerDetails.last_name || '').toUpperCase();

    doc.setFontSize(26);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text(firstName, detailX, detailY);

    detailY += 10;
    doc.setFontSize(32);
    doc.setTextColor(22, 101, 52);
    doc.text(lastName, detailX, detailY);

    detailY += 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(detailX, detailY, pageWidth - 25, detailY);

    detailY += 10;
    const col1 = detailX;
    const col2 = detailX + 75;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("BATTING STYLE", col1, detailY);
    doc.text("BOWLING STYLE", col2, detailY);

    detailY += 6;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(playerDetails.batting_style || 'N/A', col1, detailY);
    doc.text(playerDetails.bowling_style || 'N/A', col2, detailY);

    detailY += 12;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("AGE", col1, detailY);

    detailY += 6;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 41, 59);
    const ageVal = playerDetails.dob ? Math.abs(new Date(Date.now() - new Date(playerDetails.dob).getTime()).getUTCFullYear() - 1970) + ' YRS' : 'N/A';
    doc.text(ageVal, col1, detailY);

    detailY += 14;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.roundedRect(detailX, detailY, pageWidth - detailX - 25, 22, 3, 3, 'FD');

    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("AUCTION STATUS & BID INFO", detailX + 8, detailY + 7);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    if (p.sold_price) {
      doc.setTextColor(217, 119, 6);
      doc.text(`SOLD FOR: INR ${p.sold_price.toLocaleString()}`, detailX + 8, detailY + 16);
    } else if (p.is_captain || p.is_icon || p.is_owner) {
      doc.setTextColor(22, 101, 52);
      const desig = p.is_captain ? '👑 CAPTAIN (RETAINED)' : p.is_icon ? '⭐ ICON PLAYER' : '🛡️ OWNER PLAYER';
      doc.text(desig, detailX + 8, detailY + 16);
    } else {
      doc.setTextColor(30, 41, 59);
      doc.text("AVAILABLE IN AUCTION POOL", detailX + 8, detailY + 16);
    }

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Slide ${i + 1} of ${playersList.length}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 8);
  }

  doc.save(filename);
};

export const generateSinglePlayerCardPDF = async (player, activeAuction) => {
  if (!player) return;
  const filename = `${player.first_name}_${player.last_name}_Card.pdf`.replace(/ /g, '_');
  await generatePlayerSlidesPDF([player], filename, activeAuction);
};
