import type { RefObject } from 'react';
import BackToTop from './BackToTop';
import { useI18n } from '../i18n';

type DigitalHumanDetailsProps = {
  onBack?: () => void;
  mainContentRef?: RefObject<HTMLElement | null>;
};

const specRows = {
  host: [
    ['CPU', 'detailsValues.cpu'],
    ['detailsContent.memory', 'DDR4-3200 128GB'],
    ['detailsContent.storage1', '512G SSD'],
    ['detailsContent.storage2', '2TB SSD'],
    ['GPU1', 'Nvidia RTX 4000 Ada 20GB'],
    ['GPU2', 'Nvidia RTX 4000 Ada 20GB'],
    ['detailsContent.networkPort', 'detailsValues.networkPort'],
    ['detailsContent.displayInterface', '1x HDMI'],
    [
      'detailsContent.otherPorts',
      'detailsValues.otherPorts'
    ]
  ],
  display: [
    ['detailsContent.display', 'detailsValues.display'],
    ['detailsContent.aspectRatio', '16:9'],
    ['detailsContent.visibleArea', '1428.48 × 803.52 mm'],
    ['detailsContent.bestResolution', '3840 × 2160 @ 60Hz'],
    ['detailsContent.responseTime', '8ms'],
    ['detailsContent.displayColors', '1.07B'],
    ['detailsContent.brightness', '500 nits'],
    ['detailsContent.contrast', '1200:1'],
    ['detailsContent.viewAngle', 'detailsValues.viewAngle']
  ],
  touch: [
    ['detailsContent.touchType', 'detailsValues.touchType'],
    ['detailsContent.coverGlass', 'detailsValues.coverGlass'],
    ['detailsContent.lightTransmission', '85%'],
    ['detailsContent.hardness', '7H'],
    ['detailsContent.touchInterface', 'USB2.0'],
    ['detailsContent.touchPoints', '10'],
    ['detailsContent.touchResponseTime', '≤15 ms'],
    ['detailsContent.touchMethod', 'detailsValues.touchMethod']
  ],
  other: [
    ['detailsContent.camera', '4mp, 2 mm @ F2.25'],
    ['detailsContent.speaker', 'detailsValues.speaker'],
    ['detailsContent.microphone', 'detailsValues.microphone'],
    ['detailsContent.weight', 'detailsValues.weight']
  ],
  environment: [
    ['detailsContent.operatingTemp', '0~40℃'],
    ['detailsContent.storageTemp', '-20~60℃'],
    ['detailsContent.humidity', '10%~90%']
  ]
} as const;

function DigitalHumanDetails({ onBack, mainContentRef }: DigitalHumanDetailsProps) {
  const { t } = useI18n();

  const renderTable = (rows: readonly (readonly [string, string])[]) => (
    <table className="details-table">
      <tbody>
        {rows.map(([labelKey, value]) => (
          <tr key={labelKey}>
            <td>{labelKey.includes('.') ? t(labelKey) : labelKey}</td>
            <td>{value.includes('.') ? t(value) : value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="details-panel">
      <div className="details-header">
        <button className="details-back-button" onClick={onBack}>
          {t('common.back')}
        </button>
        <h3 className="details-title">{t('details.title')}</h3>
      </div>
      <div className="details-section">
        <h4>{t('details.introHeading')}</h4>
        <p>{t('details.introText')}</p>
      </div>

      <div className="details-section">
        <h4>{t('details.specsHeading')}</h4>

        <h5>{t('details.hostConfig')}</h5>
        {renderTable(specRows.host)}

        <h5>{t('details.displaySpecs')}</h5>
        {renderTable(specRows.display)}

        <h5>{t('details.touchSpecs')}</h5>
        {renderTable(specRows.touch)}

        <h5>{t('details.otherSpecs')}</h5>
        {renderTable(specRows.other)}

        <h5>{t('details.environmentSpecs')}</h5>
        {renderTable(specRows.environment)}
      </div>

      <div className="details-section">
        <h4>{t('details.installHeading')}</h4>

        <h5>{t('details.unpacking')}</h5>
        <ol className="details-list">
          <li>{t('detailsContent.unpacking1')}</li>
          <li>{t('detailsContent.unpacking2')}</li>
          <li>{t('detailsContent.unpacking3')}</li>
        </ol>

        <h5>{t('details.connectionStartup')}</h5>
        <p>{t('details.peripheralsIntro')}</p>
        <div className="details-images">
          <img src="/图片1.png" alt={t('details.image1Alt')} />
          <img src="/图片2.png" alt={t('details.image2Alt')} />
        </div>

        <h5>{t('details.inspectDevice')}</h5>
        <ol className="details-list">
          <li>{t('detailsContent.inspect1')}</li>
          <li>{t('detailsContent.inspect2')}</li>
        </ol>

        <h5>{t('details.powerRequirements')}</h5>
        <p>{t('detailsContent.powerText')}</p>

        <h5>{t('details.connectDevice')}</h5>
        <ol className="details-list">
          <li>
            {t('detailsContent.powerConnection')}
            <ol className="details-sublist">
              <li>{t('detailsContent.powerConnection1')}</li>
              <li>{t('detailsContent.powerConnection2')}</li>
            </ol>
          </li>
          <li>
            {t('detailsContent.externalConnection')}
            <ol className="details-sublist">
              <li>
                {t('detailsContent.networkConnection')}
                <ol className="details-sublist">
                  <li>{t('detailsContent.wiredConnection')}</li>
                  <li>{t('detailsContent.wirelessConnection')}</li>
                </ol>
              </li>
              <li>
                {t('detailsContent.externalDisplay')}
                <ol className="details-sublist">
                  <li>{t('detailsContent.externalDisplay1')}</li>
                </ol>
              </li>
              <li>
                {t('detailsContent.inputDevices')}
                <ol className="details-sublist">
                  <li>{t('detailsContent.inputDevices1')}</li>
                </ol>
              </li>
            </ol>
          </li>
        </ol>

        <h5>{t('details.startDevice')}</h5>
        <p>{t('detailsContent.startupText')}</p>
      </div>
      <BackToTop containerRef={mainContentRef} />
    </div>
  );
}

export default DigitalHumanDetails;
