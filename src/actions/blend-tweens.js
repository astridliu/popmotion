import Action from './';
import { getProgressFromValue, getValueFromProgress } from '../inc/calc';
import { clamp } from '../inc/transformers';

const clampProgress = clamp(0, 1);

function calcValueAtTime(from, to, duration, elapsed, ease) {
  const progressAtTime = ease(clampProgress(getProgressFromValue(0, duration, elapsed)));
  return getValueFromProgress(from, to, progressAtTime);
}

class TweenBlend extends Action {
  static defaultProps = {
    accuracy: 60
  };

  onStart() {
    const { from, to, duration, accuracy } = this.props;
    const a = from;
    const b = to;
    const aDuration = a.getDuration();
    const bDuration = b.getDuration();

    this.duration = duration || Math.min(
      aDuration - a.getElapsed(),
      bDuration
    );

    const aEase = a.getProp('ease');
    const bEase = b.getProp('ease');
    const aFrom = a.getProp('from');
    const bFrom = b.getProp('from');
    const aTo = a.getProp('to');
    const bTo = b.getProp('to');
    const bValueAtBlendComplete = calcValueAtTime(bFrom, bTo, bDuration, this.duration, bEase);
    const bStartsHigherThanA = bFrom > a.get();

    this.blendPoints = [
      [0, a.get()],
      [this.duration, bValueAtBlendComplete]
    ];

    // Find tween intersection
    const timestep = this.duration / accuracy;

    let foundP1 = false;
    let foundP2 = false;

    for (let i = 0; i < accuracy; i++) {
      const totalTime = i * timestep;

      const aValueAtTime = calcValueAtTime(aFrom, aTo, aDuration, a.elapsed + totalTime, aEase);
      const bValueAtTime = calcValueAtTime(bFrom, bTo, bDuration, b.elapsed + totalTime, bEase);

      const hasIntersected = (
        (bStartsHigherThanA && aValueAtTime < bValueAtTime) ||
        (!bStartsHigherThanA && aValueAtTime > bValueAtTime)
      );

      if (!foundP1 && hasIntersected) {
        this.blendPoints.splice(0, 1, [totalTime, bValueAtTime]);
        foundP1 = true;
      }

      // TODO go back through and comment
      const hasIntersectedB = (
        (bStartsHigherThanA && aValueAtTime < bValueAtTime) ||
        (!bStartsHigherThanA && aValueAtTime > bValueAtTime)
      );

      if (foundP1 && hasIntersectedB) {
        this.blendPoints[2] = [totalTime, bValueAtTime];
        foundP2 = true;
      }

      if (foundP2) {
        return;
      }
    }

    to.start();
  }

  onUpdate() {
    const { from, to } = this.props;
    const a = from;
    const b = to;

    const progress = clampProgress(getProgressFromValue(this.blendPoints[0][0], this.blendPoints[2][0], a.getElapsed()));
    if (progress >= 1) {
      return b.get();
    } else {
      const aP = getValueFromProgress(this.blendPoints[0][1], this.blendPoints[1][1], progress);
      const bP = getValueFromProgress(this.blendPoints[1][1], this.blendPoints[2][1], progress);
      return getValueFromProgress(aP, bP, progress);
    }
  }
}

export default (props) => new TweenBlend(props);
